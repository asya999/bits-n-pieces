load("utils.js");

var offset =  0;
var numDocs =  10000;

// This assumes you have a single "example" doc in oneDoc collection
// which will be read and inserted numDocs times (starting at _id offset
// Other ways to populate data: d = {"foo":"bar"} - literal document inclusion
var d = db.oneDoc.findOne();
var t = db.docsout;

// optionally you could drop the collection first 
// t.drop();

var start = new Date()
print ("Number of documents to start with: " + t.find().count());
// use insert loop to avoid unknown _id issue
// d.x is optionally being set to 0 to test non-migrating document update
// vs migrating document update
for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i
    d.x = 0
    t.insert(d);
}

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

ops.push( { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : {"#RAND_INT" : [ 0, totaldocs ] } } ,
              description: "Find One, 0 to totaldocs"
        });
ops.push( { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : {"#RAND_INT" : [ 0, 50 ] } } ,
              description: "Find One, 0 to 50"
        });

ops.push( { op : "update",   
              ns : t.getFullName() , 
              query : { _id : { "#RAND_INT" : [ 0 , 50 ] } } , 
              update : updateThatGrows, 
              description: "Hot update, 0 to 50" 
        });

ops.push( { op : "update",   
              ns : t.getFullName() , 
              query : { _id : { "#RAND_INT" : [ 50 , 100 ] } } , 
              update : updateThatGrows,
              safe : true,
              description: "Safe hot update, 50 to 100"
       });

ops.push({ op : "update",   
              ns : t.getFullName() , 
              query : { _id : { "#RAND_INT" : [ 100 , totaldocs ] } } , 
              update : updateThatGrows,
              description: "Update (cold), 15000 to 55K"
         });

ops.push({ op : "update",   
              ns : t.getFullName() , 
              query : { _id : { "#RAND_INT" : [ 100 , totaldocs ] } } , 
              update : updateThatGrows,
              safe : true,
              description: "Safe cold update, 55K to 10K"
        });

// if you want to add/have operations, push them to ops array
findOne100 =  { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : {"#RAND_INT" : [ 0, 100 ] } } 
        } 
 ;
findOne1000 =  { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : {"#RAND_INT" : [ 0, 1000 ] } } 
        } 
 ;
findOne10000 = { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : {"#RAND_INT" : [ 0, 10000 ] } } 
        } 
 ;
findOne25000 =  { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : {"#RAND_INT" : [ 0, 25000 ] } } 
        } 
 ;
findOne100000 = { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : {"#RAND_INT" : [ 0, 100000 ] } } 
        } 
 ;

// this is a way to run single ops.  
// First argument is "seconds", second "threads", both optional
// doOne(findOne100000,5,4)
// doOne(findOne25000,5,4)
// doOne(findOne10000,1,1)
// test
doOne(findOne1000,1,1);

// operations, seconds, threads
doMany(ops,1,4)
