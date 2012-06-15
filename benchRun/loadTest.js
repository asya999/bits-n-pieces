load("utils.js");

var offset =  10000;
var numDocs =  10000;

// var d = db.oneDoc.findOne();
var t = db.insertTest;

// optionally you could drop the collection first 
// t.drop();

var start = new Date()
print ("Number of documents to start with: " + t.find().count());

var totaldocs = t.find().count();
print ("Data is inserted, total doc count: " + totaldocs);
var end = new Date()
print ("took " + (end-start)/1000 + " seconds")
// data is inserted 

// define operations you might want to swap in and out
var updateInPlace = { $inc : { x : 1 } }
var updateThatGrows = { $push : { x : "11111111111111111111111111111" } }

// define operation array section
var ops = [];

//                    intField : {"#RAND_INT" : [ 0, totaldocs ] } } ,
opInsert = { op : "insert" , 
              ns : t.getFullName() , 
              doc : { textField: "texthereetcetcewtrljsdfjdslfjglds", 
                      intField: 1 },
              description: "Insert, 0 to totaldocs"
           };

// doOne(opInsert,5,4);
var totaldocs = t.find().count();
print ("Docs :" + totaldocs);

opUpdate = { op : "update", 
              ns : t.getFullName() , 
              query : { intField : 1 } , 
              update : {$set : {intField:{ "#RAND_INT" : [ 2 , totaldocs ] } } },
              multi : true,
              description: "Update"
          };
// doOne(opUpdate,15,4);

opCreateIndex = { op : "createIndex" , 
                  ns : t.getFullName() , 
                  key : { intField : 1} ,
                  description: "Create Index"
                };

// doOne(opCreateIndex,5,1);

opQuery = {   op : "query",   
              ns : t.getFullName() , 
              query : { var6 : { "#RAND_INT" : [ 0 , totaldocs ] } , 
                        var7 : { "#RAND_INT" : [ 0 , totaldocs ] } }, 
              description: "Query 0 to total"
          };

doOne(opQuery,15,4);
doOne(opQuery,15,40);
// doOne(opQuery,5,400);
