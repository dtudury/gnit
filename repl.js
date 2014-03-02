var Gnit = require('./index');

var gnit = new Gnit({
    user: {
        name: "David Tudury",
        email: "david.tudury@gmail.com"
    }
});

gnit.init().then(function() {
    console.log("gnit:", gnit);
    require('repl').start("> ").context.gnit = gnit;
});

