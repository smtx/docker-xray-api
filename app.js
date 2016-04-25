if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};
    // 
// ,
//     methodOverride = require("method-override")

var express = require("express"),
    bodyParser  = require("body-parser"),
    app = express();

var cheerio = require('cheerio');
var Xray = require('x-ray');
var xraydriver = require('./x-ray-driver');
var x = Xray().driver(xraydriver('utf-8'));

var pageNum;
var pagePath;
var newUrl;
var enhancedParam;


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use(methodOverride());

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
    
    // if xml flag exists, switch cheerio to admit XML special elements CDATA, etc.
    if (req.body.xml){
        cheerio.prototype.options.xmlMode = true;
    } else {
        cheerio.prototype.options.xmlMode = false;
    }

    newUrl = req.body.url;
    pageNum = (req.body.pageNum) ? req.body.pageNum : null;
    switch (true) {
        case (newUrl.indexOf("rakuten.com") > -1):
            pagePath = "&page=";
            break;
        case newUrl.indexOf("rakuten.co.uk") > -1:
            enhancedParam = "?h3";
            newUrl += enhancedParam;
            pagePath = "&p="; // h=3 param to see 60 elements per page

            break;
        case newUrl.indexOf("rakuten.co.jp") > -1:
            pagePath = "&p=";
            break;
        case newUrl.indexOf("11st.co.kr") > -1:
            pagePath = "&pageNum=";
            newUrl = newUrl.replace("pageSize=20", "pageSize=100");
            break;
        case newUrl.indexOf("lazada") > -1:
            enhancedParam = "&itemperpage=120"; //itemperpage=120 param to see 120 elements per page
            newUrl += enhancedParam;
            pagePath = "&page="; 
            break;
        case newUrl.indexOf("yahoo") > -1:
            enhancedParam = "&n=100";
            newUrl += enhancedParam;
            pagePath = "&b=" + pageNum + "01" + "&xargs";
            break;
        case newUrl.indexOf("aliexpress") > -1:
            pagePath = "&page=" + pageNum;
        default:
            console.log("Entro a default");
    }
    if(enhancedParam)
        newUrl += enhancedParam;
    if(pagePath && pageNum)
        newUrl += (pagePath + pageNum);
    if (req.body.wait && req.body.nightmare){
        var request = require("request");
        var options =  { method: 'POST',
            url: req.body.nightmare,
            headers:
            {   'cache-control': 'no-cache',
                'content-type': 'application/json' },
            body: { url: newUrl,
                    pageNum: pageNum ? pageNum : null},
            json: true };

        request(options, function (error, response, body) {
            if (error) throw new Error(error);

            process_data(body);
        });        
    } else {
         if (req.body.charset){
            x.driver(xraydriver(req.body.charset));
        } else {
            x.driver(xraydriver('utf-8'));
        }

        process_data(newUrl);
    }


  function process_data(d){
    if (d != undefined){
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
                                if (typeof obj[k] == 'string'){
                                    obj[k] = setRegex(obj[k],req.body.regex[k]);                            
                                } else {
                                    Object.keys(obj[k]).forEach(function(n){
                                        if( req.body.regex[k+'_'+n] ){
                                            obj[k][n] = setRegex(obj[k][n],req.body.regex[k+'_'+n]);                                                                                    
                                        } else {
                                            obj[k][n] = setRegex(obj[k][n],req.body.regex[k]);                                        
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
                res.json(obj);
            });
        }        
    } else {
        res.send('error');
    }      
  }

});


app.use(router);

server = app.listen(8888, function() {
  console.log("Node server running on http://localhost:8888");
});

server.timeout = 600000;

function setRegex(obj,regex){
    if (!regex) return obj;
    // var data = obj.replace(/["|.]/g,'');
    var data = obj;
    if (arrMatches = data.match(regex)){
        data = arrMatches[1] || arrMatches[0];
    } else {
        data = 0;
    }
    return data;
}
