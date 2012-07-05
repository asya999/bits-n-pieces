var offset = 0;
var numDocs =  1000000;

var t = db.twitstream;

var totaldocs = t.find().count();

print (totaldocs);

var start1 = new Date();

res = t.aggregate([ {$match:{"entities.user_mentions.screen_name":{$exists:true}} }, {$unwind:"$entities.user_mentions"}, {$project: {"mentioned":"$entities.user_mentions.screen_name"  }  }, {$group: {_id:"$mentioned", sum: {$sum:1}  } }, {$match:{"sum":{$gt:1} } }, {$sort:{"sum":-1} }, {$limit:10}, {$project:{"ScreenName":"$_id","NumberOfMentions":"$sum", "_id":0 }} ]);

var end1 = new Date();
printjson(res);
print ("Aggregation took " + (end1-start1)/1000 + " seconds");

res = db.runCommand({"aggregate":"twitstream"}, { pipeline: [ {$match:{"entities.user_mentions.screen_name":{$exists:true}} }, {$unwind:"$entities.user_mentions"}, {$project: {"mentioned":"$entities.user_mentions.screen_name"  }  }, {$group: {_id:"$mentioned", sum: {$sum:1}  } }, {$match:{"sum":{$gt:1} } }, {$sort:{"sum":-1} }, {$limit:10}, {$project:{"ScreenName":"$_id","NumberOfMentions":"$sum", "_id":0 }} ]});

var end2 = new Date();
printjson(res);
print ("Aggregation took " + (end2-end1)/1000 + " seconds");

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
