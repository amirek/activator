/**
 * Copyright (C) 2013 Typesafe <http://typesafe.com/>
 */
package controllers.api

import play.api.Logger
import play.api.mvc._
import play.api.libs.json._
import play.filters.csrf._
import activator._
import activator.cache.TemplateMetadata
import scala.concurrent.Future
import scala.util.control.NonFatal

object Templates extends Controller {
  val templateCache = activator.UICacheHelper.makeDefaultCache(snap.Akka.system)

  // Here's the JSON rendering of template metadata.
  implicit object Protocol extends Format[TemplateMetadata] {
    def writes(o: TemplateMetadata): JsValue =
      JsObject(
        List("id" -> JsString(o.id),
          "name" -> JsString(o.name),
          "title" -> JsString(o.title),
          "timestamp" -> JsNumber(o.timeStamp),
          "creationTime" -> JsNumber(o.persistentConfig.creationTime),
          "sourceLink" -> JsString(o.sourceLink),
          "description" -> JsString(o.description),
          "featured" -> JsBoolean(o.featured),
          "authorName" -> JsString(o.persistentConfig.authorName),
          "authorLink" -> JsString(o.persistentConfig.authorLink),
          "authorTwitter" -> o.persistentConfig.authorTwitter.map(JsString(_)).getOrElse(JsNull),
          "authorBio" -> o.persistentConfig.authorBio.map(JsString(_)).getOrElse(JsNull),
          "authorLogo" -> o.persistentConfig.authorLogo.map(JsString(_)).getOrElse(JsNull),
          "category" -> JsString(o.persistentConfig.category),
          "tags" -> JsArray(o.tags map JsString.apply)))
    //We don't need reads, really
    def reads(json: JsValue): JsResult[TemplateMetadata] =
      JsError("Reading TemplateMetadata not supported!")
  }

  def list = Action.async { request =>
    import concurrent.ExecutionContext.Implicits._
    templateCache.metadata map { m => Ok(Json toJson m) }
  }

  def meta(templateId: String) = Action.async { request =>
    import concurrent.ExecutionContext.Implicits._
    templateCache.template(templateId) map { t =>
      t match {
        case Some(m) => Ok(Json.toJson(m.metadata))
        case _ => NotFound
      }
    }
  }

  def tutorial(id: String, location: String) = Action.async { request =>
    import concurrent.ExecutionContext.Implicits._
    templateCache tutorial id map { tutorialOpt =>
      // TODO - Use a Validation  applicative functor so this isn't so ugly.
      val result =
        for {
          tutorial <- tutorialOpt
          file <- tutorial.files get location
        } yield file
      result match {
        case Some(file) => Ok sendFile file
        case _ => NotFound
      }
    }
  }

  private def bestEffortCreateTypesafeProperties(location: java.io.File, subscriptionIdOption: Option[String]): Unit =
    subscriptionIdOption.filter(_.trim.nonEmpty).map { subscriptionId =>
      val propertiesFile = new java.io.File(location, "project/typesafe.properties")
      try {
        // templates should not have the file already, but if they do, punt because
        // we don't know what's going on.
        if (location.exists && !propertiesFile.exists) {
          propertiesFile.getParentFile().mkdirs() // in case project/ doesn't exist
          val props = new java.util.Properties()
          props.setProperty("typesafe.subscription", subscriptionId)
          val stream = new java.io.FileOutputStream(propertiesFile)
          props.store(stream, "Typesafe Reactive Platform subscription ID, see https://typesafe.com/subscription")
          stream.close()
        } else {
          System.out.println(s"Not writing project/typesafe.properties to $location ${if (location.exists) s"($location does not exist)"} ${if (propertiesFile.exists) s"($propertiesFile already exists)"}")
        }
      } catch {
        case NonFatal(e) =>
          System.err.println(s"Failed to write $propertiesFile: ${e.getClass.getName}: ${e.getMessage}")
      }
    }

  // this is not a controller method, also invoked by HomePageActor
  def doCloneTemplate(templateId: String, location: java.io.File, name: Option[String], subscriptionId: Option[String]): Future[ProcessResult[Unit]] = {
    import scala.concurrent.ExecutionContext.Implicits._
    // for now, hardcode that we always filter metadata if it is NOT a templateTemplate, and
    // never do if it is a templateTemplate. this may be a toggle in the UI somehow later.
    templateCache.template(templateId) flatMap { templateOpt =>
      templateOpt foreach { t =>
        // kick off async template analytics
        TemplatePopularityContest.recordCloned(t.metadata.name) recover {
          case NonFatal(e) =>
            Logger.info(s"Failed to record a clone of '${t.metadata.name}': ${e.getClass.getName}: ${e.getMessage}")
            Future.successful(200)
        }
      }
      activator.cache.Actions.cloneTemplate(
        templateCache,
        templateId,
        location,
        name,
        filterMetadata = !templateOpt.map(_.metadata.templateTemplate).getOrElse(false),
        additionalFiles = UICacheHelper.scriptFilesForCloning) map { result =>
          bestEffortCreateTypesafeProperties(location, subscriptionId)
          result
        }
    }
  }

  def cloneTemplate = CSRFCheck {
    Action.async(parse.json) { request =>
      val location = new java.io.File((request.body \ "location").as[String])
      val templateid = (request.body \ "template").as[String]
      val name = (request.body \ "name").asOpt[String]
      val subscriptionId = (request.body \ "subscriptionId").asOpt[String]
      import scala.concurrent.ExecutionContext.Implicits._
      val result = doCloneTemplate(templateid, location, name, subscriptionId)
      result.map(x => Ok(request.body)).recover {
        case e => NotAcceptable(e.getMessage)
      }
    }
  }
}
