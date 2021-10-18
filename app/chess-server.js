import process from 'process';

var express = require('express');
var compression = require('compression');
var app = express();
var path = require('path');
var urlencode = require('urlencode');

var stockfish = require("stockfish");

var fs = require('fs');
var settings = JSON.parse(fs.readFileSync(path.resolve(__dirname, './settings.json'), 'utf8'));

process.on('uncaughtException', function (error) {
  console.log(error.stack);
});

function getBestMove(options, callback) {
  var instance = stockfish();
  var scoreStats = 0;
  // set the callback for each message
  instance.onmessage = function (event) {
    var message = event.data || event;

    console.log(typeof event, event);

    if (typeof message === 'string') {
      var split = message.split(/ +/);
      for (var i = 0; i < split.length; i++) {
        if(split[0] !=='bestmove' && split[i] == 'cp'){
          scoreStats = split[i+1];
        }
      }
      if (split[0] == 'bestmove') {
        callback(new Array(split[1], scoreStats));
      }
    }
  };

  // set the fen, then perform the search with the given movetime
  instance.postMessage('position fen ' + options.fen);
  instance.postMessage('go movetime ' + options.movetime);
}

function getBoardEvaluation(options, callback){ 
  var instance = stockfish();

  // set the callback for each message
  instance.onmessage = function (event){
    var message = event.data || event;

    console.log(typeof event, event);

    if(typeof message === 'string'){
      // tu treba nac sad finalni dio
      var split = message.split("\n");
      for(var i = 0; i< split.length;i++)
      {
        if(split[i].includes("Final evaluation"))
        {
          split = split[i].split(" ");
          for(i = 0;i<split.length;i++)
          {
            if(parseInt(split[i]))
            {
              callback(new Array(split[i]));
            }
          }
        }
      }
    }
  }

  // set the fen, then do the evaluation
  instance.postMessage('position fen ' + options.fen);
  instance.postMessage('eval');
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
  res.send({ "apis": ['/moves','/evaluation'] });
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
      "suggestion": '/moves?fen=' + urlencode('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') + '&movetime=5'
    });
    return;
  }

  var movetime = parseInt(req.query.movetime, 10);

  getBestMove({ fen: fen, movetime: movetime }, function (moveResponse, err) {
    if (err) {
      console.error(err);
      res.status(500);
      res.send({ "error": err });
      return;
    }

    res.status(200);
    res.send({ "bestmove": moveResponse[0], "score" : moveResponse[1], "movetime": movetime });
  });
});

console.log('registering /evaluation');
app.get('/evaluation', function (req, res) {
  console.log('GET ' + req.originalUrl);

  res.set({
    'Content-Type': 'application/json'
  });

  var fen = req.query.fen;
  if (!fen) {
    res.status(500);
    res.send({
      "error": "Parameter 'fen' is required.",
      "suggestion": '/evaluation?fen=' + urlencode('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') + 'eval'
    });
    return;
  }

  getBoardEvaluation({ fen: fen, eval: eval }, function (moveResponse, err) {
    if (err) {
      console.error(err);
      res.status(500);
      res.send({ "error": err });
      return;
    }

    res.status(200);
    res.send({ "evaluation": moveResponse[0]});
  });
});

var port = settings.port;
app.listen(port);
console.log('listening on ' + port);