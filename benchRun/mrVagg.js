var offset = 0;
var numDocs =  1000000;

var d = db.oneDoc.findOne();
// var d = {"foo":"bar"};
var t = db.docsout;

// optionally you could drop the collection first 
// t.drop();

var start = new Date();
print ("Number of documents to start with: " + t.find().count());
// use insert loop to avoid unknown _id issue
// d.x is optionally being set to 0 to test non-migrating document update
// vs migrating document update
for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i
    d.x = 0
  //   t.insert(d);
}

var end = new Date();
var totaldocs = t.find().count();
print ("Data is inserted, total doc count: " + totaldocs);
print ("Inserting took " + (end-start)/1000 + " seconds");
// data is inserted 


var start1 = new Date();
res = t.aggregate( [ {$project:{comments:1,_id:0}}, { $unwind : "$comments" }, { $group :  { _id : "$comments", totals : {$sum:1} } } ] );
var end1 = new Date();
printjson(res);
print ("Aggregation took " + (end1-start1)/1000 + " seconds");


map = function() {
    if (!this.tags) {
        return;
    }

    for (index in this.tags) {
        emit(this.tags[index], 1);
    }
};
reduce = function(previous, current) {
    var count = 0;

    for (index in current) {
        count += current[index];
    }

    return count;
};

var start2 = new Date();

result = db.runCommand({
 "mapreduce" : "docsout",
 "map" : map,
 "reduce" : reduce,
 "out" : "tags"});

var end2 = new Date();
printjson(result);
s = db.tags.find().count();
print (s);
print ("Map reduce took " + (end2-start2)/1000 + " seconds");
