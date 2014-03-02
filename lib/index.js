var when = require('when');
var exec = require('child_process').exec;
var nodefn = require("when/node/function");

var _xStatusMeanings = {
    '?': "untracked",
    '!': "ignored",
    ' ': "not updated in index",
    'M': "updated in index",
    'A': "added to index",
    'D': "deleted from index",
    'R': "renamed in index",
    'C': "copied in index"
};
var _yStatusMeanings = {
    ' ': "index and work tree matches",
    'M': "work tree changed since index",
    'D': "deleted in work tree"
};
var _conflictStatusMeanings = {
    'DD': "unmerged, both deleted",
    'AU': "unmerged, added by us",
    'UD': "unmerged, deleted by them",
    'UA': "unmerged, added by them",
    'DU': "unmerged, deleted by us",
    'AA': "unmerged, both added",
    'UU': "unmerged, both modified"
};
module.exports = function Gnit(configs) {
    var self = this;
    self.getRoot = function getRoot () {
        return nodefn.call(exec, "git rev-parse --show-toplevel")
            .then(function (results) {
                self.root = results[0].trim();
                return self.root;
            });
    };
    self.getModifiedFiles = function getModifiedFiles () {
        return nodefn.call(exec, "git ls-files -m")
            .then(function (results) {
                self.modified_files= results[0].split(/\r\n|\r|\n/).filter(function(n){return n; });
                return self.modified_files;
            });
    };
    self.getCachedFiles = function getCachedFiles () {
        return nodefn.call(exec, "git ls-files -c")
            .then(function (results) {
                self.cached_files= results[0].split(/\r\n|\r|\n/).filter(function(n){return n; });
                return self.cached_files;
            });
    };
    self.getDeletedFiles = function getDeletedFiles () {
        return nodefn.call(exec, "git ls-files -d")
            .then(function (results) {
                self.deleted_files= results[0].split(/\r\n|\r|\n/).filter(function(n){return n; });
                return self.deleted_files;
            });
    };
    self.getStatus = function getStatus () {
        return nodefn.call(exec, "git status --porcelain")
            .then(function (results) {
                self.status = [];
                results[0].replace(/(.)(.) ([^ \r\n]*)(?: -> ([^\r\n]*))?/g, function(match, x, y, path1, path2){
                    var meaning = "";
                    if(_conflictStatusMeanings[x+y]) meaning = _conflictStatusMeanings[x+y];
                    else {
                        meaning = _xStatusMeanings[x];
                        if(_yStatusMeanings[y]) meaning += ", " + _yStatusMeanings[y];
                    }
                    self.status.push({
                        x: x,
                        y: y,
                        meaning: meaning,
                        path1: path1,
                        path2: path2
                    });
                });
                return self.status;
            });
    };
    self.init = function init() {
        return self.getRoot()
            .then(self.getModifiedFiles)
            .then(self.getCachedFiles)
            .then(self.getDeletedFiles)
            .then(self.getStatus);
    };
};
