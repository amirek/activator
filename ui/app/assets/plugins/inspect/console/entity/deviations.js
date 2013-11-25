/*
 Copyright (C) 2013 Typesafe, Inc <http://typesafe.com>
 */
define(['text!./deviations.html', 'core/pluginapi', './../widget', '../format'], function(template, api, ConsoleWidget, formatter) {
    var ko = api.ko;
    return api.Class(ConsoleWidget, {
        id: 'console-deviations-widget',
        template: template,
        init: function(args) {
            var self = this;
            this.data = ko.observable({ 'deviations': [], 'total': 0 });
            this.errors = ko.observableArray([]);
            this.warnings = ko.observableArray([]);
            this.deadLetters = ko.observableArray([]);
            this.unhandledMessages = ko.observableArray([]);
            this.deadlocks = ko.observableArray([]);
            this.errorCount = ko.observable(0);
            this.warningCount = ko.observable(0);
            this.deadLetterCount = ko.observable(0);
            this.unhandledMessageCount = ko.observable(0);
            this.deadlockCount = ko.observable(0);
        },
        dataName: 'deviations',
        dataTypes: ['deviations'],
        dataScope: {},
        onData: function(data) {
            this.formatTimestamp = function(value) {
                return formatter.formatTime(new Date(value));
            };
            this.format = function(collection, deviationType) {
                var newCollection = [];
                for (var i = 0; i < collection.length; i++) {
                    var element = {
                        'event' : collection[i].event,
                        'message' : collection[i].message,
                        'timestamp' : this.formatTimestamp(collection[i].timestamp),
                        'traceLink' : "#inspect/deviation/" + deviationType + "/" + collection[i].trace.substring(collection[i].trace.lastIndexOf('/') + 1)
                    };
                    newCollection.push(element);
                }
                return newCollection;
            };

            this.errors(this.format(data.deviations.errors, "Error"));
            this.warnings(this.format(data.deviations.warnings, "Warning"));
            this.deadLetters(this.format(data.deviations.deadLetters, "Deadletter"));
            this.unhandledMessages(this.format(data.deviations.unhandledMessages, "Unhandled Message"));
            this.deadlocks(this.format(data.deviations.deadlocks, "Deadlock"));
            this.errorCount(data.deviations.errorCount);
            this.warningCount(data.deviations.warningCount);
            this.deadLetterCount(data.deviations.deadLetterCount);
            this.unhandledMessageCount(data.deviations.unhandledMessageCount);
            this.deadlockCount(data.deviations.deadlockCount);
        }
    });
});
