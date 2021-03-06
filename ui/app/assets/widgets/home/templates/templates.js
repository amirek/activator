/*
 Copyright (C) 2014 Typesafe, Inc <http://typesafe.com>
 */
define([
  'commons/settings',
  'commons/websocket',
  'widgets/fileselection/fileselection',
  'text!./templates.html',
  'widgets/modals/modals',
  'css!./templates'
], function(
  settings,
  websocket,
  FileSelection,
  tpl,
  modals
) {

  var trpInfoSeen = settings.observable("reactive-platform.accepted-license", false);

  var typesafeId = settings.observable("TypesafeID", "");
  var activeOk = ko.observable(!!typesafeId());
  function saveTypesafeID(e){
    var id = e.target.value.trim();
    if (id.length === 36){
      activeOk(true);
      typesafeId(id);
    } else {
      activeOk(false);
      typesafeId("");
    }
  }
  function askForTypesafeId(callback){
    var message = $("<article/>").html("<p>You are creating Typesafe Reactive Platform project, which requires a Typesafe ID.</p><p>You can retrieve your ID, or sign up for a free trial, on the <a href='https://typesafe.com/product/typesafe-reactive-platform/id' target='_blank'>subscription ID page</a> page.<p><p class='input'></p>")[0];
    $("<input class='typesafeId-form' type='text' />").change(saveTypesafeID).keyup(saveTypesafeID).val(typesafeId()).appendTo($(".input", message));
    modals.show({
      shape: "large",
      title: "Submit your Typesafe ID",
      body: message,
      ok: "Submit",
      okEnabled: activeOk,
      callback: function() {
        callback(typesafeId());
      },
      cancel: "Cancel"
    });
  }

  // Memorise last used directory
  var lastFolder = settings.observable("last-folder", window.homeFolder);


  function formToJson(form) {
    var data = $(form).serializeArray();
    var o = {}
    $.each(data, function() {
      if (o[this.name] !== undefined) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]];
        }
        o[this.name].push(this.value || '');
      } else {
        o[this.name] = this.value || '';
      }
    });
    return o;
  }

  // App Model
  var State = function(){
    var self = this;

    self.filteredTemplates = ko.observableArray(window.tutorials);
    self.filteredSeeds = ko.observableArray(window.seeds);
    self.filteredTrp = ko.observableArray(window.trp);
    self.currentApp = ko.observable();
    self.currentAppId = ko.computed(function(){
      return !!self.currentApp()?self.currentApp().id:"";
    });
    self.browseAppLocation = ko.observable(false);
    self.filterValue = ko.observable("");
    self.tags = window.tags;
    self.lastFolder = lastFolder;
    self.trpInfoSeen = trpInfoSeen;

    self.acceptTrp = function(){
      self.trpInfoSeen(true);
    }
    self.cancelTrp = function(){
      self.openedTab("templates");
    }

    // Toggling chosen template view
    self.chooseTemplate = function(app){
      self.currentApp(app);
    }
    self.closeTemplate = function(){
      self.currentApp("");
    }

    // Filtering
    self.searchTag = function(m,e){
      self.filterValue(e.currentTarget.innerHTML);
      self.search();
    }
    self.searchSeedTag = function(m,e){
      self.filterValue(e.currentTarget.innerHTML);
      self.search();
    }
    self.searchTrpTag = function(m,e){
      self.filterValue(e.currentTarget.innerHTML);
      self.search();
    }

    self.clearSearch = function(){
      self.filterValue("");
      self.search();
      // filterInput.val("").trigger("search")[0].focus();
    }

    function searchRelevantFileds(o, value) {
      return JSON.stringify([o.title, o.tags, o.authorName]).toLowerCase().indexOf(value) >= 0;
    }

    self.search = function(model,e){
      if (e){
        self.filterValue(e.currentTarget.value);
      }
      var value = self.filterValue().toLowerCase();
      self.filteredTemplates(window.tutorials.filter(function(o){
        return searchRelevantFileds(o, value);
      }));
      self.filteredSeeds(window.seeds.filter(function(o){
        return searchRelevantFileds(o, value);
      }));
      self.filteredTrp(window.trp.filter(function(o){
        return searchRelevantFileds(o, value);
      }));
    }

    // Browsing FS
    self.closeNewBrowser = function() {
      $("#newAppLocationBrowser").hide();
    }
    self.openedTab = ko.observable('templates');
    self.showTemplates = function() {
      self.openedTab('templates');
    }
    self.showSeeds = function() {
      self.openedTab('seed');
    }
    self.showTrp = function() {
      self.openedTab('trp');
    }

    self.fs = new FileSelection({
      title: "Select location for new application",
      initialDir: lastFolder,
      selectText: 'Select this Folder',
      onSelect: function(file) {
        // Update our store...
        $("#newAppLocationBrowser .close").trigger("click");
        $("#newappLocation").val(file + window.separator + $("#appName").val());
      },
      onCancel: function() {
        self.toggleDirectoryBrowser();
      }
    });

    self.newAppFormSubmit = function(state) {
      // use the placeholder values, unless one was manually specified
      var appLocationInput = $("#newappLocation");
      var appNameInput = $("#appName");
      var parentFolder = appLocationInput.val().split(window.separator).slice(0,-1).join(window.separator);

      if(!appLocationInput.val())
        appLocationInput.val(appLocationInput.attr('placeholder'));
      if (!appNameInput.val())
        appNameInput.val(appNameInput.attr('placeholder'));

      // Now we find our sneaky saved template id.
      // var template = appTemplateName.attr('data-template-id');
      var msg = formToJson("#newApp");
      msg.request = 'CreateNewApplication';

      if (self.currentApp().tags.indexOf("reactive-platform") >= 0) {
        askForTypesafeId(function(id) {
          msg.subscriptionId = id;
          websocket.send(msg);
          lastFolder(parentFolder); // memorise parent as default location
          $('#working, #open, #new').toggle();
        });
      } else {
        websocket.send(msg);
        lastFolder(parentFolder); // memorise parent as default location
        $('#working, #open, #new').toggle();
      }

      return false;
    }

    self.toggleDirectoryBrowser = function() {
      $('#newAppForm, #newAppLocationBrowser').toggle();
    };
    self.toggleSelectTemplateBrowser = function() {
      $('#homePage, #templatePage').toggle();
    };

    // Register fancy radio button controls.
    self.clickTemplate = function(event) {
      // TODO - Remove this bit here
      $('input:radio', this).prop('checked',true);
    }

    self.clickBrowseAppLocation = function(event) {
      self.toggleDirectoryBrowser();
    }

  };


  // // TODO - Figure out what to do when selecting a new template is displayed
  // showTemplatesLink.on('click', function(event) {
  //   event.preventDefault();
  //   toggleSelectTemplateBrowser();
  // });

  return {
    render: function() {
      return ko.bindhtml(tpl, new State());
    }
  }

});
