var express = require('express');
var compression = require('compression');
var app = express();
var path = require('path');
var urlencode = require('urlencode');

var stockfish = require("stockfish");

var fs = require('fs');
var settings = JSON.parse(fs.readFileSync(path.resolve(__dirname, './settings.json'), 'utf8'));

function getBestMove(options, callback) {
  var instance = stockfish();

  // set the callback for each message
  instance.onmessage = function (event) {
    var message = event.data || event;

    console.log(typeof event, event);

    if (typeof message === 'string') {
      //'bestmove g1f3 ponder g8f6'
      var split = message.split(/ +/);
      var scoreStats = 0;
      for (var i = 0; i < split.length; i++) {
        if(split[i]=="scorecp"){
          scoreStats = split[i+1];
        }
      }
      if (split[0] == 'bestmove') {
        callback(new Array(split[1], split, scoreStats));
      }
    }
  };

  // set the fen, then perform the search with the given time
  instance.postMessage('position fen ' + options.fen);
  instance.postMessage('go movetime ' + options.time);
}

app.use(compression({
  threshold: 0,
  filter: function (req, res) {
    return true;
  }
}));

console.log('registering /');
app.get('/', function (req, res) {
  console.log('GET ' + req.originalUrl);


  res.set({
    'Content-Type': 'application/json'
  });

  res.status(200);
  res.send({ "apis": ['/moves'] });
});

console.log('registering /moves');
app.get('/moves', function (req, res) {
  console.log('GET ' + req.originalUrl);


  res.set({
    'Content-Type': 'application/json'
  });

  var fen = req.query.fen;
  if (!fen) {
    res.status(500);
    res.send({
      "error": "Parameter 'fen' is required.",
      "suggestion": '/moves?fen=' + urlencode('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') + '&movetime=15'
    });
    return;
  }

  var time = parseInt(req.query.time, 10) || 15;
  time = Math.min(time, 20);

  getBestMove({ fen: fen, time: time }, function (moveResponse, err) {
    if (err) {
      console.error(err);
      res.status(500);
      res.send({ "error": err });
      return;
    }

    res.status(200);
    res.send({ "bestmove": moveResponse[0], "cjeli string" : moveResponse[1], "scoreCP" : moveResponse[2], "time": time });
  });
});

var port = settings.port;
app.listen(port);
console.log('listening on ' + port);