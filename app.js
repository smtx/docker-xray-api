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
var SlackBot = require('slackbots');
var bot;



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
    if(req.body.bot_token)
        bot = new SlackBot({
            token: req.body.bot_token,
            name: 'Recipes Bot'
        });
    newUrl = req.body.url;
    pagePath = (req.body.pagePath) ? req.body.pagePath : null;
    enhancedParam = (req.body.enhancedParam) ? req.body.enhancedParam : null;
    pageNum = (req.body.pageNum) ? req.body.pageNum : null;
    if(req.body.replace1 && req.body.replace2){
        var r1 = "" + req.body.replace1;
        var r2 = "" + req.body.replace2;
        newUrl = newUrl.replace(r1,r2);
    }
    if(enhancedParam)
        newUrl += enhancedParam;
    if(pagePath && pageNum)
        newUrl += (pagePath + pageNum);
    if (req.body.nightmare){
        var request = require("request");
        var options =  { method: 'POST',
            url: req.body.nightmare,
            headers:
            {   'cache-control': 'no-cache',
                'content-type': 'application/json' },
            body: { url: newUrl,
                    pageNum: pageNum ? pageNum : null,
                    click: req.body.click ? req.body.click : null},
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
      const MAX_ERROR_COUNT = 50;
      const MAX_ERROR_COUNT_FOR_ARTICLE = 1;
    if (d != undefined){
        var js = req.body.recipe;
        var errorsInKeys = JSON.parse(JSON.stringify(req.body.recipe));
        var keysInRecipe = Object.keys(js);
        for(var prop in errorsInKeys){
            errorsInKeys[prop] = 0;
        }
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
                            var b;
                            for(var a in data){
                                for(var c = 0; c < keysInRecipe.length; c++){
                                    var count = 0;
                                    if(a != 'last'){
                                        if(!data[a].hasOwnProperty(keysInRecipe[c]))
                                        {
                                            count++;
                                            errorsInKeys[keysInRecipe[c]] += count;
                                            if(errorsInKeys[keysInRecipe[c]] >= MAX_ERROR_COUNT)
                                            {
                                                b = true;
                                            }

                                        }
                                    }
                                }
                            }
                            if(bot && b)
                            {
                                var fields = [];
                                for (var property in errorsInKeys) {
                                    if (errorsInKeys.hasOwnProperty(property) && errorsInKeys[property] >= MAX_ERROR_COUNT) {
                                        var field = {};
                                        field.value = 'Errores: ' + errorsInKeys[property];
                                        field.title = 'Propiedad: ' + property;
                                        fields.push(field);
                                    }
                                }
                                bot.postMessageToGroup('pulpou-notifications', "<@eliseoci>", {
                                    "attachments": [
                                        {
                                            "fallback": "Info no capturada en receta.",
                                            "color": 'danger',
                                            "pretext":"Info no capturada en recipe LS",
                                            "title": "Marketplace: " + req.body.url,
                                            "text": "",
                                            "fields": fields,
                                            "mrkdwn_in": "fields"
                                        }
                                    ]
                                },function (data) {
                                    if(data.error) console.log(data.error);
                                });
                            }
                        }
            });
            var j = x(d, req.body.selector, [js])
                    .paginate(req.body.paginate).limit(parseInt(limit))(function(err, obj) {
                        if(err) throw err;
                        if ( next ){
                            res.json({data:obj,next:next});
                            var b;
                            for(var a in obj){
                                for(var c = 0; c < keysInRecipe.length; c++){
                                    var count = 0;
                                    if(a != 'last'){
                                        if(!obj[a].hasOwnProperty(keysInRecipe[c]))
                                        {
                                            count++;
                                            errorsInKeys[keysInRecipe[c]] += count;
                                            if(errorsInKeys[keysInRecipe[c]] >= MAX_ERROR_COUNT){
                                                b = true;
                                            }
                                        }
                                    }
                                }
                            }
                            if(bot && b)
                            {
                                var fields = [];
                                for (var property in errorsInKeys) {
                                    if (errorsInKeys.hasOwnProperty(property) && errorsInKeys[property] >= MAX_ERROR_COUNT) {
                                        var field = {};
                                        field.value = 'Errores: ' + errorsInKeys[property];
                                        field.title = 'Propiedad: ' + property;
                                        fields.push(field);
                                    }
                                }
                                bot.postMessageToGroup('pulpou-notifications', "<@eliseoci>", {
                                    "attachments": [
                                        {
                                            "fallback": "Info no capturada en receta.",
                                            "color": 'danger',
                                            "pretext":"Info no capturada en recipe LS",
                                            "title": "Marketplace: " + req.body.url,
                                            "text": "",
                                            "fields": fields,
                                            "mrkdwn_in": "fields"
                                        }
                                    ]
                                },function (data) {
                                    if(data.error) console.log(data.error);
                                });
                            }
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
                for(var c = 0; c < keysInRecipe.length; c++){
                    var count = 0;
                    var b;
                    if(!obj.hasOwnProperty(keysInRecipe[c])) {
                        count++;
                        errorsInKeys[keysInRecipe[c]] += count;
                        if(errorsInKeys[keysInRecipe[c]] >= MAX_ERROR_COUNT_FOR_ARTICLE)
                        {
                            b = true;
                        }
                    }
                }
                res.json(obj);
                if(bot && b){
                    var fields = [];
                    for (var property in errorsInKeys) {
                        if (errorsInKeys.hasOwnProperty(property) && errorsInKeys[property] >= MAX_ERROR_COUNT_FOR_ARTICLE) {
                            var field = {};
                            field.value = 'Errores: ' + errorsInKeys[property];
                            field.title = 'Propiedad: ' + property;
                            fields.push(field);
                        }
                    }
                    bot.postMessageToGroup('pulpou-notifications', "<@eliseoci>", {
                        "attachments": [
                            {
                                "fallback": "Info no capturada en receta.",
                                "color": 'danger',
                                "pretext":"Info no capturada en recipe article",
                                "title": "Marketplace: " + req.body.url,
                                "text": "",
                                "fields":fields,
                                "mrkdwn_in": "fields"
                            }
                        ]
                    },function (data) {
                        if(data.error) console.log(data.error);
                    });
                }

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
