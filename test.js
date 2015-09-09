var Nightmare = require('nightmare');
new Nightmare()
  .goto('http://yahoo.com')
  .type('input[title="Search"]', 'github nightmare')
  .click('.searchsubmit')
  .evaluate(function(){
    return document.body;
  },function(document){
    console.log(document);
  })
  .run();
