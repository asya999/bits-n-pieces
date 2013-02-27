var offset = 0;
var numDocs =  1; // 1000000;

//var d = db.oneDoc.findOne();
// var d = {"foo":"bar"};
var t = db.rand2;
var t2 = db.aggpairs;;


// optionally you could drop the collection first 
// t.drop();

var start = new Date();
print ("Number of documents to start with: " + t.find().count());
// use insert loop to avoid unknown _id issue
// d.x is optionally being set to 0 to test non-migrating document update
// vs migrating document update
for ( i=offset; i<offset+numDocs; i++ ) {
// random number between 1 and 10
    var num = Math.floor(Math.random() * 10);
    var num2 = Math.floor(Math.random() * 10);
    d = {};
    d._id = i;
    d.x = num;
    d.y = num2;
    //t.insert(d);
}

var end = new Date();
var totaldocs = t.find().count();
print ("Data is inserted, total doc count: " + totaldocs);
print ("Inserting took " + (end-start)/1000 + " seconds");
// data is inserted 


var start1 = new Date();
res = t.aggregate( [ { $group :  { _id : {x:"$x",y:"$y"}, totals : {"$sum":1} } } ] );
var end1 = new Date();
//printjson(res);
print(res.result.length);
print ("Aggregation took " + (end1-start1)/1000 + " seconds");
t2.save(res.result);

 values.forEach(function(v) {
	 var bid = v['bid'];
     var ts = v['ts'];
}

if (xyz == 0) {
} else if () {
}

map = function() {
    emit({i:[this.x,this.y]},1);
};
reduce = function(k, vals) {
    var bid_low = Number.MAX_VALUE;
    var count=0;
    count += vals.count;
    return count;
};

var start2 = new Date();

result = db.runCommand({
 "mapreduce" : "rand2",
 "map" : map,
 "reduce" : reduce,
 "out" : "pairs"});

var end2 = new Date();
printjson(result);
s = db.pairs.find().count();
print (s);
print ("Map reduce took " + (end2-start2)/1000 + " seconds");
