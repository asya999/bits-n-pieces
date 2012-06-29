//
//  Quick and dirty test to make sure benchRun can run
//  at mongo prompt type
//  >  load("basicTest.js")
//  and see if you get sensible output
//

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
// this is a hack because I can't find a way to get the "real" shell version
// from the script and some benchRun functionality was added in 2.1.x
sversion = version_;
print("Shell version: "+version_.x);
if (version_.x > 4296000000) {
   print ("Doing benchRun inserts")
   opi.push({ op : "insert" , ns : t.getFullName() , doc : { "name" : "Asya"} });
} else {
   print ("Doing manual insert")
   for (i=0; i<100; i++) { t.insert({"name":"Asya"}); }
}

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

