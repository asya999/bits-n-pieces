
d = db;
t = db.benchRunTestColl;
print ("Connection: " + db.getMongo());
print ("Database: " + db);
print ("Collection: " + t.getFullName());
dbv = db.serverBuildInfo();
print("DB Version: "+dbv.version);
opi = []
ops1 = []
ops2 = []
insertDoc = { customerId: {#RAND_INT: [1,10000] ,
              <etc>
            };
opi.push({ op : "insert" , ns : t.getFullName() , doc : insertDoc });

// won't find anything if we used ObjectIds for _id
ops1.push({ op : "findOne" , ns : "test.foo" , query : { _id : 1 } });

// will update one doc at a time since "multi" is not set
ops2.push({ op : "update" , ns : "test.foo" , query : { "name": "Asya"}, update : { $inc : {x:1} }});

if (version_.x > 4296000000) {
    res =  benchRun( { parallel : 2, seconds: 1, ops : opi } )
    print("Inserts per second: ", res.insert);
}

res =  benchRun( { parallel : 2, seconds: 1, ops : ops1 } )
print("Queries per second: ", res.query);

res =  benchRun( { parallel : 2, seconds: 1, ops : ops2 } )
print("Updates per second: ", res.update);

// clean up after ourselves
t.drop();

