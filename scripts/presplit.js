/* converts v of type tp to number 
hexString = yourNumber.toString(16);
yourNumber = parseInt(hexString, 16);
*/

convertTo = function( v, tp) {
    var i=0;
    switch(tp) {
       case "numberI": 
             return v.valueOf();
             break;
       case "numberL": 
             return v.valueOf();
             break;
       case "number": 
             return v;
             break;
       case "string": 
             i = parseInt(v);
             break;
       case "ObjectId": 
             i = parseInt(v.valueOf().slice(0,8), 16);;
             break;
       case "Date": 
             i = parseInt(v.getTime())/1000;
             break;
       default: print("Type " + tp + "not supported yet, supported types are number, string, ObjectId, Date and Bin");
    } 
    return i;
}

convertBack = function( i, tp) {
    var v=null;
    switch(tp) {
       case "numberI": 
             return v;
       case "numberL": 
       case "number": 
             return v;
             break;
       case "string": 
             i = parseInt(v);
             break;
       case "ObjectId": 
             i = parseInt(v.valueOf().slice(0,8), 16);;
             break;
       case "Date": 
             i = parseInt(v.getTime())/1000;
             break;
       default: print("Type " + tp + "not supported yet, supported types are number, string, ObjectId, Date and Bin");
    } 
    return i;
}

figureOutType = function( v ) { /*
      if (typeof(v) != "object") return(typeof(v));
      if (v isinstanceof ObjectId)  return("ObjectId");
      if (v isinstanceof Date)  return("Date");  */
}

/* minv and maxv must be the same type and that type defines what shard keys will be */
/* if you get it wrong you are screwed */
presplit = function ( ns, minvalue, maxvalue) {
    var debug=true;
    if( typeof(minvalue) != typeof(maxvalue) ) { 
       print("Whoa, the types of min and max must be the same and they are " + typeof(minvalue) + " and " + typeof(maxvalue) + "!");
       return;
    }
    tp = figureOutType(minvalue);
    minv = convertTo(minvalue, tp);
    maxv = convertTo(maxvalue, tp);
    cfg = db.getSiblingDB("config");
    if (cfg.chunks.count({ns:ns})>1) {
        print("You already have more than one chunk!");
        return;
    }
    if (db.getSiblingDB(ns.split(".")[0]).getCollection(ns.split(".")[1]).count()>0) {
        print("This collection is not empty!");
        return;
    }
    if (sh.getBalancerState()) {
        print("Balancer is running, please turn it off and try again!");
        return;
    }
    numShards = cfg.shards.count();
    shards = [];
    cfg.shards.find({},{_id:1}).toArray().forEach(function(s) { shards.push(s._id); });
    if (cfg.collections.count({_id:ns, dropped:false}) == 0) { 
        print("No sharded collection " + ns + " found!");
        return;
    }
    if (debug) print("Got past all the checks");
    var key = cfg.collections.findOne({_id:ns, dropped:false}).key;
    var first = 1;
    for (var i in key) { 
        if (first == 1) { var P=i; first=false; continue; }
        key[i] = MinKey;
    }
    if (debug) print("Key will be " + tojson(key));
    var nchunks = numShards*4;
    var step = Math.round((maxv-minv)/(nchunks));
    var start = minv+step;
    var stop = maxv;
    if (debug) print(nchunks, step, start, stop);
    for (i=start,s=0; i<stop; i+=step, s++) {
        /* key[P] = convertBack(i, tp); or i of appropriate type */
        key[P] = i;
        toShard = shards[s%numShards];
        print("will be spliting at " + tojson(key) + " and moving to " + toShard);
        var res = sh.splitAt( ns, key );
        if ( res.ok != 1 )  {
           print("Split did not succeed with error message: '" + res.errmsg + "' will not try to move");
           continue;
        }
        res = sh.moveChunk( ns, key, toShard);
        if ( res.ok != 1 && res.errmsg != "that chunk is already on that shard" ) 
            print("moveChunk did not succeed with error message: '" + res.errmsg + "'");
    }

}
