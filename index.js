var express = require("express"),
    app = express(),
    bodyParser  = require("body-parser"),
    methodOverride = require("method-override");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

var router = express.Router();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

router.get('/', function(req, res) {
   res.send("Hello "+req.query.nombre+"!");
});

router.post('/', function (req, res) {

  var Xray = require('x-ray');
  var x = Xray();

  var js = JSON.parse(req.body.recipe);

  if (req.body.click!==undefined){
    var Nightmare = require('nightmare');
    new Nightmare()
      .goto(req.body.url)
      .click(req.body.click)
      .wait()
      .evaluate(function(){
        return document;
      },function(document){
        var j = x(document.all[0].outerHTML, 'body',js)(function(err, obj) {
          res.json(obj);
        });
        // console.log(document.all[0].outerHTML);
      })
      .run();
  } else {
    if (req.body.paginate!==undefined && req.body.selector!==undefined){
      if (req.body.limit!==undefined){
        var limit = req.body.limit;
      } else {
        var limit = 3;
      }
      var j = x(req.body.url, req.body.selector, [js])
                .paginate(req.body.paginate).limit(parseInt(limit))(function(err, obj) {
        res.json(obj);
      });

    } else {
      if (req.body.url!==undefined) {
        var j = x(req.body.url, js)(function(err, obj) {
          res.json(obj);
        });
      } else {
        var aUrls = JSON.parse(req.body.urls);
        var resultados = [];
        aUrls.forEach(function(url){
          var j = x(url, js)(function(err, obj) {
            resultados.push({'url':url,'res':obj});
            if (resultados.length >= aUrls.length){
              res.json(resultados);
            }
          });
        });
      }
    }

  }
})


app.use(router);

app.listen(8888, function() {
  console.log("Node server running on http://localhost:8888");
});
