load("utils.js");

var offset =  0;
var numDocs =  50000;

var t = db.ins2;
t.drop()

t.ensureIndex({a:1},{sparse:true});

var totaldocs = t.find().count();

// define operation array section
var ops = [];

ops.push( { op : "insert" , 
              ns : t.getFullName() , 
              doc : { i : 0 } ,
              description: "Unsafe Insert 0 - totaldocs"
        });

ops.push( { op : "insert" , 
              ns : t.getFullName() , 
              doc : { i : 0 } ,
              safe : true,
              description: "Safe Insert 0 - totaldocs"
        });

ops.push( { op : "update",   
              ns : t.getFullName() , 
              query : { _id : { "a" : 0} } , 
              upsert : true,
              update : { i : 0 } ,
              description: "Unsafe update" 
        });

ops.push( { op : "update",   
              ns : t.getFullName() , 
              query : { _id : { "a" : 0} } , 
              update : { i : 0} ,
              upsert : true,
              safe : true,
              description: "Safe update" 
        });

// operations, seconds, threads
for (i in ops) {

   t.drop()
   t.ensureIndex({a:1},{sparse:true});
   doOne(ops[i],10,4)
   print (t.count());
}
