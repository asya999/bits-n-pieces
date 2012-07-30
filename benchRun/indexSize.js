var offset = 0;
var numDocs =  1000000;

var t = db.indSize;
var t2 = db.indSize2;

// var d = t.findOne();
var d = {"name":"Asya"};

var start = new Date()
for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i;
    d.Timestamp=new Date();
    t.insert(d);
}

for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i;
    tm = new Date();
    d.Timestamp= new Date(tm.getFullYear(),tm.getMonth(),tm.getDate());
    t2.insert(d);
    t2.insert(d);
}

var totaldocs = t.find().count();
var totaldocs2 = t2.find().count();

var zero = new Date();
print (zero, totaldocs, totaldocs2);

t.ensureIndex({Timestamp:1});
t2.ensureIndex({Timestamp:1});
print (totaldocs);

