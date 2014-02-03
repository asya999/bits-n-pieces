var debug=true;
var minchar=32;
var maxchar=122;
/* converts v of type tp to number 
hexString = yourNumber.toString(16);
yourNumber = parseInt(hexString, 16);
*/

convertTo = function( v, tp) {
    var i=0;
    if (debug) print("*** tp in convertTo " + tp);
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
             fi=v.charCodeAt(0);
             se=v.charCodeAt(1);
             i = fi*10000+se;
             if (debug) print("Convert " + v + " to " + i + " from " + fi + " " + se);
             break;
       case "ObjectId": 
             i = parseInt(v.valueOf().slice(0,8), 16);
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
             return NumberInt(i);
             break;
       case "numberL": 
             return NumberLong(i);
             break;
       case "number": 
             return i;
             break;
       case "string": 
             fi = Math.round(i/10000)
             se = i-Math.round(fi*10000);
             if (debug) print("*** se is " + se);
             if (se>maxchar) se = maxchar;
             if (se<minchar) se = minchar;
             v = String.fromCharCode(fi, se);
             if (debug) print("Convert " + v + " from " + i + " " + fi);
             break;
       case "ObjectId": 
             v = i.toString(16) + "0000000000000000";
             break;
       case "Date": 
             v = new Date(v*1000);
             break;
       default: print("Type " + tp + "not supported yet, supported types are number, string, ObjectId, Date and Bin");
    } 
    return v;
}

figureOutType = function( v ) {
      var x = typeof(v);
      if (debug) print("** in figureOutType " + v + " " + x);
      if (x != "object") return(x);
      if (v instanceof ObjectId)  return("ObjectId");
      if (v instanceof Date)  return("Date");
      if (v instanceof NumberInt) return("numberI");
      if (v instanceof NumberLong) return("numberL");
}

/* minv and maxv must be the same type and that type defines what shard keys will be */
/* if you get it wrong you are screwed */
presplit = function ( ns, minvalue, maxvalue) {
    if( typeof(minvalue) != typeof(maxvalue) ) { 
       print("Whoa, the types of min and max must be the same and they are " + typeof(minvalue) + " and " + typeof(maxvalue) + "!");
       return;
    }
    if (debug) print("Before", minvalue, typeof(minvalue),typeof(maxvalue));
    tp = figureOutType(minvalue);
    if (debug) print("**** tp is " + tp);
    minv = convertTo(minvalue, tp);
    maxv = convertTo(maxvalue, tp);
    if (tp=="string") {
       minchar = minvalue.charCodeAt(1);
       maxchar = maxvalue.charCodeAt(1);
    }
    if (debug) print("After", minvalue, typeof(minvalue),typeof(maxvalue), "type saved is ", tp);
    cfg = db.getSiblingDB("config");
    if (cfg.chunks.count({ns:ns})>1) {
        print("You already have more than one chunk!");
        if (!debug) return;
    }
    var dbname = ns.split(".")[0];
    var collname = ns.split(".")[1];
    if (db.getSiblingDB(dbname).getCollection(collname).count()>0) {
        print("This collection is not empty!");
        if (!debug) return;
    }
    numShards = cfg.shards.count();
    shards = [];
    cfg.shards.find({},{_id:1}).toArray().forEach(function(s) { shards.push(s._id); });
    if (cfg.collections.count({_id:ns, dropped:false}) == 0) { 
        print("No sharded collection " + ns + " found!");
        if (!debug) return;
    }
    if (sh.getBalancerState()) {
        print("Balancer is running, please turn it off and try again!");
        if (!debug) return;
    }
    if (debug) print("Got past all the checks");
    var ckey = cfg.collections.findOne({_id:ns, dropped:false});
    if (debug && ckey==null) key={"_id":1};
    else key = ckey.key;
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
    if (debug) print("Chunk, step, start, stop", nchunks, step, start, stop);
    for (i=start,s=0; i<stop; i+=step, s++) {
        key[P] = convertBack(i, tp);
        /* key[P] = i; */
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
