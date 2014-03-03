var fs = require('fs');
var path = require('path');
var when = require('when');
var exec = require('child_process').exec;
var nodefn = require("when/node/function");

function parseCommit(commit) {
    var obj = {};
    var parts = commit.split(/(?:\r\n|\r|\n){2}/);
    obj.message = parts[1].trim();
    parts[0].replace(/([^ \r\n]*) ([^\r\n]*)/g, function (match, key, value) {
        obj[key] = value;
    });
    return obj;
}

function parseTree(tree) {
    var output = [];
    tree.replace(/(\d+)\s+(\w+)\s+(\w+)\s+(\S+)/g, function (match, mode, type, hash, filename) {
        output.push({
            mode: mode,
            type: type,
            hash: hash,
            filename: filename
        });
    });
    return output;
}

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
                self.dot_git = path.join(self.root, ".git");
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
    self.getHeadRef = function getHeadRef () {
        return nodefn.call(fs.readFile, path.join(self.dot_git, "HEAD"), "utf8")
            .then(function (data) {
                self.head_ref = /ref: (.*)/.exec(data)[1];
                return self.head_ref;
            });
    };
    self.getHeadHash = function getHeadHash () {
        return nodefn.call(fs.readFile, path.join(self.dot_git, self.head_ref), "utf8")
            .then(function (data) {
                self.head_hash = data.trim();
            });
    };
    self.getHead = function getHead () {
        return nodefn.call(exec, "git cat-file -p " + self.head_hash)
            .then(function (results) {
                return self.parseHead(results[0]);
            });
    };
    self.parseHead = function (head) {
        var obj = parseCommit(head);
        return when.join(
                nodefn.call(exec, "git cat-file -p " + obj.parent)
                    .then(function (results) {
                        obj.parent = parseCommit(results[0]);
                    }),
                nodefn.call(exec, "git cat-file -p " + obj.tree)
                    .then(function (results) {
                        obj.tree = parseTree(results[0]);
                    })
                    /*
                    .then(function () {
                        return nodefn.call(exec, "git cat-file -p " + obj.tree[4].hash)
                            .then(function (results) {
                                console.log(results[0]);
                            });
                    })
                    */
            )
            .then(function () {
                console.log(obj);
            });
    };
    self.init = function init() {
        return self.getRoot()
            .then(self.getModifiedFiles)
            .then(self.getCachedFiles)
            .then(self.getDeletedFiles)
            .then(self.getStatus)
            .then(self.getHeadRef)
            .then(self.getHeadHash)
            .then(self.getHead)
    };
};

