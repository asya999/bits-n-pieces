load("utils.js");

// t = db.docsout;
t = db.fs.files;

var totaldocs = t.find().count();
print ("Data is inserted, total doc count: " + totaldocs);

var ops = [];


ops.push( { op : "findOne" , 
              ns : t.getFullName() , 
              query : { _id : ObjectId("4fd9218f594bc075e400000e") },
              description: "Find One, 0 to 50"
        });

// operations, seconds, threads
doMany(ops,1,4)
