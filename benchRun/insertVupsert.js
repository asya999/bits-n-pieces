load("utils.js");

var offset =  0;
var numDocs =  50000;

var d = {"foo":"bar"};

t=db.insertTest;
// optionally you could drop the collection first 
t.drop();
t.ensureIndex({a:1}, {sparse:true});

var start = new Date()
print ("Number of documents to start with: " + t.find().count());
// use insert loop to avoid unknown _id issue
// d.x is optionally being set to 0 to test non-migrating document update
// vs migrating document update
for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i;
    d.x = 0;
    t.insert(d);
}

var totaldocs = t.find().count();
print ("Data is inserted, total doc count: " + totaldocs);
var end = new Date()
print ("Inserts took " + (end-start)/1000 + " seconds")
// data is inserted 

t=db.saveTest;

t.drop();
t.ensureIndex({a:1}, {sparse:true});

start = new Date()
print ("Number of documents to start with: " + t.find().count());
for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i;
    d.x = 0;
    t.save(d);
}

var totaldocs = t.find().count();
print ("Data is upserted, total doc count: " + totaldocs);
var end = new Date()
print ("Saves took " + (end-start)/1000 + " seconds")
// data is inserted 

t=db.upsertTest;

t.drop();
t.ensureIndex({a:1}, {sparse:true});

start = new Date()
print ("Number of documents to start with: " + t.find().count());
for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i;
    d.x = 0;
    t.update({a:"x"},d,true);
}

var totaldocs = t.find().count();
print ("Data is upserted, total doc count: " + totaldocs);
var end = new Date()
print ("Upserts took " + (end-start)/1000 + " seconds")
