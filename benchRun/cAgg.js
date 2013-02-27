var offset = 0;
var numDocs =  1000000;

var t = db.bigAgg;

var d = t.findOne();

var start = new Date()
for ( i=offset; i<offset+numDocs; i++ ) {
    d._id = i
    d.hdr_event_number="XDAS_AE_CREATE_SESSION"
    t.insert(d);
}

// for ( i=numDocs; i<numDocs+numDocs; i++ ) {
// d._id = i
// d.hdr_event_number="XDAS_AE_CREATE_SESSION2"
//    t.insert(d);
// }

var totaldocs = t.find().count();

var zero = new Date();
print (zero);

t.ensureIndex({hdr_event_number:1});
print (totaldocs);

var start0 = new Date();
// pipeline = [ { "$group" : { "_id" : { "hdr_event_number":"$hdr_event_number"}, "numbEvent" : { "$sum" : 1}}}]
pipeline = [ {$sort:{hdr_event_number:1}}, {$project:{"hdr_event_number":1,"_id":0 } } , { "$group" : { "_id" : "$hdr_event_number", "numEv" : { "$sum" : 1}}}]

res = t.aggregate(pipeline);
var start1 = new Date();
printjson(res);
print ("Sorted Aggregation took " + (start1-start0)/1000 + " seconds");

pipeline = [ { "$group" : { "_id" : "$hdr_event_number", "numbEvent" : { "$sum" : 1}}}]
res = t.aggregate(pipeline);

var end1 = new Date();
printjson(res);
print ("Simplified unnamed Aggregation took " + (end1-start1)/1000 + " seconds");

pipeline = [ {$match:{_id:{$lt:1500000},_id:{$gt:500000}} }, {$project:{"hdr_event_number":1,"_id":0 } } , { "$group" : { "_id" : "$hdr_event_number", "numEv" : { "$sum" : 1}}}]
res = t.aggregate(pipeline);

var end2 = new Date();
printjson(res);
print ("Smaller projected aggregation took " + (end2-end1)/1000 + " seconds");

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

// result = db.runCommand({
 // "mapreduce" : "twitstream",
 // "map" : map,
 // "reduce" : reduce,
 // "out" : "tags"});
// 
// var end2 = new Date();
// printjson(result);
////  // s = db.tags.find().count();
// print (s);
// print ("Map reduce took " + (end2-start2)/1000 + " seconds");
