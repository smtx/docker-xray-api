var express = require("express"),
    app = express(),
    bodyParser  = require("body-parser"),
    methodOverride = require("method-override");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

var router = express.Router();

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
      .evaluate(function(){
        return document.body;
      },function(document){
        var j = x(document.innerHTML, 'body',js)(function(err, obj) {
          console.log('nightmare');
          res.json(obj);
        });
      })
      .run();
  } else {
    // ################
    // OLX ARTILCE EXAMPLE
    // { 'name': 'p.user-name', 'phone': 'p.user-phone'  }

    var j = x(req.body.url, 'body',js)(function(err, obj) {
      // console.log(err);
      res.json(obj);
    });

  }
})

app.use(router);

app.listen(8888, function() {
  console.log("Node server running on http://localhost:8888");
});
