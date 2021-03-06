/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define([
  'text!./welcome.html',
  'commons/settings',
  'widgets/layout/layout',
  'widgets/layout/layoutManager',
  'css!./welcome.css'
], function(
  tpl,
  settings,
  layout,
  layoutManager
){

  var presentationModeStyle = (function() {
    var added = false;
    var cssStr = ".presentation-mode .tutorial .page, .presentation-mode .build .logs, .presentation-mode .run .pluginBlock, .presentation-mode .code .editor, .presentation-mode .monitoring .tabs-step { zoom: 141% !important; }";
    var style;

    try {
      // Create the <style> tag
      style = document.createElement("style");
      // WebKit hack :(
      style.appendChild(document.createTextNode(""));
      // Add the <style> element to the page
      style.sheet.insertRule(cssStr);
    } catch(e){
      style = undefined;
    }

    return function() {
      if (!added && style) {
        document.head.appendChild(style);
        added = true;
      }
    }
  }());

  var WelcomeState = (function(){
    var self = {};

    self.appVersion = window.serverAppVersion

    self.presentationMode = settings.observable("presentationMode", false);

    ko.computed(function() {
      var on = self.presentationMode();
      if (on) {
        document.body.style.zoom = "75%";
        document.body.classList.add("presentation-mode");
        presentationModeStyle();
      } else {
        document.body.style.zoom = "1";
        document.body.classList.remove("presentation-mode");
      }
      layoutManager.panelOpenedSet(false);
      layoutManager.navigationOpened(!on);
      return;
    });

    return self;
  }());

  return {
    render: function() {
      layout.renderPlugin(ko.bindhtml(tpl, WelcomeState));
    }
  }

});
