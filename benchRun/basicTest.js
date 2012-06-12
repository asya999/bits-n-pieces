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
ops = []
// this is a hack because I can't find a way to get the "real" shell version
// from the script and some benchRun functionality was added in 2.1.x
sversion = version_;
print("Shell version: "+version_.x);
if (version_.x > 4296000000) {
   print ("Doing benchRun inserts")
   ops.push({ op : "insert" , ns : t.getFullName() , doc : { "name" : "Asya"} });
} else {
   print ("Doing manual insert")
   for (i=0; i<100; i++) { t.insert({"name":"Asya"}); }
}

// won't find anything since we used ObjectIds for _id
ops.push({ op : "findOne" , ns : "test.foo" , query : { _id : 1 } });

// will update one doc at a time since "multi" is not set
ops.push({ op : "update" , ns : "test.foo" , query : { "name": "Asya"}, update : { $inc : {x:1} }});

res =  benchRun( { parallel : 2, seconds: .1, ops : ops } )

if (version_.x > 4296000000) {
    print("Inserts per second: ", res.insert/1000);
}

print("Queries per second: ", res.query/1000);
print("Updates per second: ", res.update/1000);

// clean up after ourselves
t.drop();

