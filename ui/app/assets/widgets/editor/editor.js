define([
  "ace/ace",
  "text!./editor.html",
  "commons/settings",
  "css!./editor"
], function(
  ace,
  tpl,
  settings
) {


  // Create the editor instance once and for all
  var editor = ace.edit(document.createElement('div'));

  // Function to bind the document
  var bind = function(doc) {
    if (doc) {
      editor.setSession(doc.session);
      editor.focus();
    }
  }

  // Theme and font
  var themes = {
    "Activator Light": 'widgets/editor/themes/activator-light',
    "Activator Dark": 'widgets/editor/themes/activator-dark',
    "Ambiance": "ace/theme/ambiance",
    "Chaos": "ace/theme/chaos",
    "Chrome": "ace/theme/chrome",
    "Clouds Midnight": "ace/theme/clouds_midnight",
    "Clouds": "ace/theme/clouds",
    "Cobalt": "ace/theme/cobalt",
    "Crimson Editor": "ace/theme/crimson_editor",
    "Dawn": "ace/theme/dawn",
    "Dreamweaver": "ace/theme/dreamweaver",
    "Eclipse": "ace/theme/eclipse",
    "Github": "ace/theme/github",
    "Idle Fingers": "ace/theme/idle_fingers",
    "Katzenmilch": "ace/theme/katzenmilch",
    "Kr Theme": "ace/theme/kr_theme",
    "Kuroir": "ace/theme/kuroir",
    "Merbivore Soft": "ace/theme/merbivore_soft",
    "Merbivore": "ace/theme/merbivore",
    "Mono Industrial": "ace/theme/mono_industrial",
    "Monokai": "ace/theme/monokai",
    "Pastel on Dark": "ace/theme/pastel_on_dark",
    "Solarized Dark": "ace/theme/solarized_dark",
    "Solarized Light": "ace/theme/solarized_light",
    "Terminal": "ace/theme/terminal",
    "Textmate": "ace/theme/textmate",
    "Tomorrow Night Blue": "ace/theme/tomorrow_night_blue",
    "Tomorrow Night Bright": "ace/theme/tomorrow_night_bright",
    "Tomorrow Night Eighties": "ace/theme/tomorrow_night_eighties",
    "Tomorrow Night": "ace/theme/tomorrow_night",
    "Tomorrow": "ace/theme/tomorrow",
    "Twilight": "ace/theme/twilight",
    "Vibrant Ink": "ace/theme/vibrant_ink",
    "Xcode": "ace/theme/xcode"
  }

  var chosenTheme = settings.observable("code.theme", Object.keys(themes)[0]);
  doOnChange(chosenTheme, function(t) {
    editor.setTheme(themes[t]);
  });

  var fontSizes = {
    "Small": "12px",
    "Medium": "14px",
    "Large": "17px",
    "XLarge": "22px"
  }
  var chosenFontSize = settings.observable("code.fontSize", Object.keys(fontSizes)[0]);
  doOnChange(chosenFontSize, function(t) {
    editor.container.style.fontSize = fontSizes[t];
  });

  // ------------------------ NOTE ------------------------
  // TAB SIZE and SOFT TABS are defined in `plugins/code/document.js`
  // Because ace editor requires them to be attached to an EditSession
  // ------------------------------------------------------

  var State = {
    themes: Object.keys(themes),
    chosenTheme: chosenTheme,
    fontSizes: Object.keys(fontSizes),
    chosenFontSize: chosenFontSize,
    editorContainer: editor.container
  }

  return {
    render: function(selectedDocument) {
      State.selectedDocument = selectedDocument;
      selectedDocument.subscribe(bind)
      if (selectedDocument()){
        bind(selectedDocument());
      }
      return bindhtml(tpl, State);
    }
  }

})