load("utils.js");

var offset =  0;
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

//                      intField: 1, x: 0 },
opInsert = { op : "insert" , 
              ns : t.getFullName() , 
              doc : { textField: "texthereetcetcewtrljsdfjdslfjglds", 
                    intField : {"#RAND_INT" : [ 0, totaldocs ] } , x: 0 } ,
              description: "Insert, 0 to totaldocs"
           };

// doOne(opInsert,5,4);
var totaldocs = t.find().count();
print ("Docs :" + totaldocs);

opUpdate1 = { op : "update", 
              ns : t.getFullName() , 
              query : { intField : 1 } , 
              update : {$set : {intField:{ "#RAND_INT" : [ 100 , totaldocs ] } } },
              multi : false,
              description: "Update1"
          };
opUpdate2 = { op : "update", 
              ns : t.getFullName() , 
              query : { intField : 1 } , 
              update : updateInPlace ,
              multi : false,
              description: "Update2"
          };
// doOne(opUpdate,15,4);

opCreateIndex = { op : "createIndex" , 
                  ns : t.getFullName() , 
                  key : { intField : 1} ,
                  description: "Create Index"
                };

doOne(opCreateIndex,1,1);

opQuery = {   op : "query",   
              ns : t.getFullName() , 
              query : { intField : { "#RAND_INT" : [ 0 , 100 ] } , x : {$gt:5} }, 
              description: "Query"
          };

ops = [ opQuery, opUpdate1, opQuery, opUpdate2 ]
doMany(ops, 60, 128, true);
// doOne(opQuery,15,4);
// doOne(opQuery,15,40);
// doOne(opQuery,5,400);
