if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

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
  
  // get data with nightmare if we need to scrape ajax content.
  if (req.body.wait){
      var vo = require('vo');
      function *process(){
        // TODO: try catch error handling
        var Nightmare = require('nightmare');
        var nightmare = Nightmare({show:true});
        var d = yield nightmare.goto(req.body.url)
            .evaluate(function(){
                return document.querySelectorAll('*')[0].innerHTML;
            });
        yield nightmare.end();
        return d;
      }
      vo(process)(function(err,result){
          //TODO: error handling
          process_data(result);
      });
  } else {
      process_data(req.body.url);
  }


  function process_data(d){
    var Xray = require('smtx-ray');
    var x = Xray();

    // if xml flag exists, switch cheerio to admit XML special elements CDATA, etc.
    if (req.body.xml){
        var cheerio = require('cheerio');
        cheerio.prototype.options.xmlMode = true;
    }

    var js = req.body.recipe;

    if (req.body.paginate!==undefined && req.body.selector!==undefined){
        if (req.body.limit!==undefined){
        var limit = req.body.limit;
        } else {
        var limit = 3;
        }
        var next = false;
        var data = false;
        var i = x(d, 'body', [req.body.paginate])
                .paginate(req.body.paginate).limit(parseInt(limit))(function(err, obj) {
                    if (err) return err;
                    if ( parseInt(obj.length) < parseInt(limit) ){
                    next = false;
                    } else {
                    next = obj.last();
                    }
                    if ( data ){
                    res.json({data:data,next:next});
                    }
        });
        var j = x(d, req.body.selector, [js])
                .paginate(req.body.paginate).limit(parseInt(limit))(function(err, obj) {
                    if ( next ){
                    res.json({data:obj,next:next});
                    } else {
                    data = obj;
                    }
        });

    } else {
        // Normalize url
        if (d.substring(0,2)=='//') d = 'http:'+d;
        var j = x(d, js)(function(err, obj) {
            if (req.body.regex){
            if (typeof obj == 'string'){
                obj = setRegex(obj,req.body.regex);
            } else {
                if (obj){
                    Object.keys(obj).forEach(function(k){
                        obj[k] = setRegex(obj[k],req.body.regex[k]);
                    });
                }
            }
            }
            res.json(obj);
        });
    }      
  }

})


app.use(router);

server = app.listen(8888, function() {
  console.log("Node server running on http://localhost:8888");
});

server.timeout = 600000;

function setRegex(obj,regex){
    if (!regex) return obj;
    var data = obj.replace(/["|.]/g,'');
    if (arrMatches = data.match(regex)){
        data = arrMatches[1] || arrMatches[0];
    } else {
        data = 0;
    }
    return data;
}
