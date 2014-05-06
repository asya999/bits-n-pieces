var debug;
var minchar=32;
var maxchar=126;
var saveBinType=0;
var lookup={ }
var lookup2={ }
/* i is char code, j is numerical sequential equivalend */
var i=0;
var j=1;
for (i=minchar;i<maxchar+1;i++,j++) { lookup[i]=j; lookup2[j]=i; }
firstChar=0;
secondChar=1;

mapNumToChar = function(n) {
    /* j to i */
    if (n>95) n=95;
    if (n<1) n=1;
    if (lookup2.hasOwnProperty(String(n))) return String.fromCharCode(lookup2[String(n)]); 
    throw "Invalid number to map to character: " + n;
}

mapCharToNum = function(s) {
    /* i to j */
    if ( lookup.hasOwnProperty(s.charCodeAt(0)) ) {
         return lookup[s.charCodeAt(0)]; 
    }
    throw "Invalid number to character to map: " + s;
}

convertFrom = function( v, tp) {
    var i=0;
    if (debug) print("*** tp in convertFrom " + tp + " with v " + v);
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
             if (debug) print("String " + v + " is " + v.slice(0,1) + " and " + v.slice(1,2) + " " + tp);
             fi = mapCharToNum(v.slice(firstChar,firstChar+1));
             se = mapCharToNum(v.slice(secondChar,secondChar+1));
             i = fi*100+se;
             if (debug) print("Converted string " + v + " to " + i + " via " + fi + "/" + se);
             break;
       case "ObjectId": 
             i = parseInt(v.valueOf().slice(0,8), 16);
             break;
       case "BinData": 
             saveBinType = v.type;
             i = parseInt(v.hex().slice(0,8), 16);
             break;
       case "Date": 
             i = parseInt(v.getTime())/1000;
             break;
       default: throw "Type " + tp + "not supported yet, supported types are numbers, string, ObjectId, Date and BinData";
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
             /* probably want to do something more specific based on alphanumeric values */
             fi = Math.floor(i/100)
             se = i-(fi*100);
             if (debug) print(""+ fi + " is fi *** se is " + se);
             /* if (se>maxchar) { 
                  se = se-(Math.floor(se/maxchar)*maxchar)+minchar;
             } 
             if (se<minchar) se = minchar; */
             if (debug) print( " " + mapNumToChar(fi) + " and " + mapNumToChar(se));
             v = mapNumToChar(fi) + mapNumToChar(se);
             if (debug) print("Converted back num " + i + " to " + v + ", " + fi + " " + se);
             break;
       case "ObjectId": 
             v = ObjectId(i.toString(16) + "0000000000000000");
             break;
       case "BinData": 
             v = BinData(saveBinType, i.toString(16) + "0000000000000000");
             break;
       case "Date": 
             v = new Date(v*1000);
             break;
       default: throw "Type " + tp + "not supported yet, supported types are number, string, ObjectId, Date and Bin";
    } 
    return v;
}

figureOutType = function( v ) {
      var x = typeof(v);
      if (true) print("** in figureOutType " + v + " " + x);
      if (x != "object") return(x);
      if (v instanceof ObjectId)  return("ObjectId");
      if (v instanceof Date)  return("Date");
      if (v instanceof NumberInt) return("numberI");
      if (v instanceof NumberLong) return("numberL");
      if (v instanceof BinData) return("BinData");
}

/* minv and maxv must be the same type and that type defines what shard keys will be */
/* if you get it wrong you are screwed */
presplit = function ( ns, minvaluein, maxvaluein, debug) {
    minvalue=minvaluein;
    maxvalue=maxvaluein;
    if (debug==undefined) debug=false;
    if (ns==undefined || ns=="usage") {
         print("presplit(ns, minval, maxval) - Takes namespace and min and max values of the first field of the shard key,");
         print("\t\t\t\t\tand creates splits to generate 4x as many chunks as shards and");
         print("\t\t\t\t\tthen distributes them round-robin to every shard");
         print("\t\t\t\t\tCollection must exist, be empty, be sharded and balancer must be off");
         return;
    }
    if( typeof(minvalue) != typeof(maxvalue) ) throw "The types of min and max must be the same!";
    if (debug) print("Before", minvalue, typeof(minvalue),typeof(maxvalue));
    tp = figureOutType(minvalue);
    tp2 = figureOutType(minvalue);
    if (tp!=tp2) throw "The types of min and max must be the same!";
    if (debug) print("**** tp is " + tp);
    if (tp=="BinData") {
        minvalue=maxvaluein;
        maxvalue=minvaluein;
    }
    if (tp=="string")
        for (i=firstChar; i<minvaluein.length,i<maxvaluein.length; i++) {
          if ( minvalue[firstChar]==maxvalue[firstChar] ) {
              firstChar=i+1;
              secondChar=i+2;
          } else {
              break;
          }
        }

    minv = convertFrom(minvalue, tp);
    maxv = convertFrom(maxvalue, tp);
    if (tp=="string") {
       minchar = minvalue.charCodeAt(1);
       maxchar = maxvalue.charCodeAt(1)-13;
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
    var startShard=0;
    primaryShard=cfg.databases.findOne({_id:dbname})["primary"];
    cfg.shards.find({},{_id:1}).sort({_id:1}).toArray().forEach(function(s) { 
           shards.push(s._id); 
           if (s._id==primaryShard) startShard=shards.length;
    });
    print("startShard,primaryShard " + startShard + " " + primaryShard + " " + tojson(shards));
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
    var step = Math.floor(1+((maxv-minv)/(nchunks)));
    var start = minv+step;
    var stop = maxv;
    if (true) print("Chunk, step, min, max", nchunks, step, minv, maxv);
    if (true) print("Shard, s, shards, numShards", primaryShard, startShard, tojson(shards), shards.length);
    if (debug) print("Chunk, step, start, stop", nchunks, step, start, stop);
    for (i=start,s=startShard; i<stop; i+=step, s++) {
        print("i, step, start, stop", i, step, start, stop);
        key[P] = convertBack(i, tp);
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
