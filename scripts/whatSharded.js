load(d+"aggutil.js");

shortDate = function (dt) {
    cmin = ""+dt.getUTCMinutes(); 
    csec = ""+dt.getUTCSeconds();
    if (cmin.length==1) cmin="0"+cmin;
    if (csec.length==1) csec="0"+csec;
    return dt.getUTCFullYear() + "/" + (dt.getUTCMonth()+1) + "/" + dt.getUTCDate()+" "+dt.getUTCHours() + ":" + cmin + ":" + csec;
}

fmtAborted = function( changeDoc, printTime ) {
    ret = "";
    details = changeDoc.details;
    if (details.hasOwnProperty("step6 of 6")) ret += "\taborted in step 6";
    else if (details.hasOwnProperty("step5 of 6")) ret += "\taborted in step 5";
    else if (details.hasOwnProperty("step4 of 6")) ret += "\taborted in step 4";
    else if (details.hasOwnProperty("step3 of 6")) ret += "\taborted in step 3";
    else if (details.hasOwnProperty("step2 of 6")) ret += "\taborted in step 2";
    else if (details.hasOwnProperty("step1 of 6")) ret += "\taborted in step 1";
    if (printTime) ret += "\t" + changeDoc.time.toISOString();
    return ret;
}

printDetailsInfo = function( chlog, ns, successful ) {

    if (successful) m1 = { $match: {"what":"moveChunk.from","details.note": {$exists:false}, "ns": ns}};
    else            m1 = { $match: {"what":"moveChunk.from","details.note": "aborted", "ns": ns}};
    var p1 = { "$project" : {
            "ns" : 1,
            "what" : 1,
            "time" : 1,
            "chunk" : { "mn" : {
                                "$ifNull" : [
                                        "$details.min",
                                        "$details.before.min"
                                ]
                        },
                        "mx" : {
                                "$ifNull" : [
                                        "$details.max",
                                        "$details.before.max"
                                ]
                        }
            },
            "step1" : { "$ifNull" : [ "$details.step1 of 6", 0 ] },
            "step2" : { "$ifNull" : [ "$details.step2 of 6", 0 ] },
            "step3" : { "$ifNull" : [ "$details.step3 of 6", 0 ] },
            "step4" : { "$ifNull" : [ "$details.step4 of 6", 0 ] },
            "step5" : { "$ifNull" : [ "$details.step5 of 6", 0 ] },
            "step6" : { "$ifNull" : [ "$details.step6 of 6", 0 ] } 
            }
    };

    var p2 = { "$project" : {
                "chunk" : 1,
		"what" : 1,
		"ns" : 1,
		"step1" : 1,
		"step2" : 1,
		"step3" : 1,
		"step4" : 1,
		"step5" : 1,
		"step6" : 1,
		"time" : 1,
                "highestStep":{$cond:["$step6",6,{$cond:["$step5",5,{$cond:["$step4",4,{$cond:["$step3",3,{$cond:["$step2",2,1]} ]} ]} ]} ]},
		"steptime" : { 
                "$add" : [ {"$ifNull": ["$step1", 0] }, {"$ifNull": ["$step2", 0] }, {"$ifNull": ["$step3", 0] },
                            {"$ifNull": ["$step4", 0] }, {"$ifNull": ["$step5", 0] }, {"$ifNull": ["$step6", 0] } ] 
                }
            }
    };

    var grp1 = {"$group": {
        _id : "$chunk" ,
        count: { "$sum": 1 },
        highestStep:{$max:"$highestStep"},
        fromTime: {$min:"$time"},
        toTime: {$max:"$time"},
        totalTime: { "$sum": "$steptime" }
        }
    };

    var grp2 = {"$group": { 
        _id: null, 
        totalStep1: {"$sum":"$step1"},
        totalStep2: {$sum:"$step2"},
        totalStep3: {$sum:"$step3"},
        totalStep4: {$sum:"$step4"},
        totalStep5: {$sum:"$step5"},
        totalTime :  {"$sum" :"$totalTime"},
        totalChunks: {$sum:1},
        totalMoves: {$sum:"$count"}
    } };

    var grp3 = {"$group": { 
        _id: "$highestStep", 
        sum: {$sum:1}
    } };

    r = chlog.aggregate(m1, p1, p2, grp1, grp2 );
    result = unagg(r)
    if (result.length==0) return;
    totTimeSec = Math.round(result[0].totalTime/1000);
    totTimeMin = Math.round(result[0].totalTime/1000/60);
    totTimeHrs = (result[0].totalTime/1000/60/60).toFixed(2);
    print("\t" + result[0].totalMoves + (successful ? " successful" : " aborted") + " migrations: "
                + "\n\t\t" + totTimeSec + " seconds (" 
                + totTimeMin + " minutes "
                + (totTimeMin > 119 ? "/ " + totTimeHrs + " hours " : "")
                + ") total spent in " + (successful ? "successful" : "aborted") +" migrations, averaging " 
                + (totTimeSec/result[0].totalMoves).toFixed(2) + " seconds per migration" + (successful ? "." : " attempt."));

    if (!detailsNS && verbose < 3) return;
    totalChunks = result[0].totalChunks;
    if (!successful) {
        r = chlog.aggregate(m1, p1, p2, grp3, {$sort:{_id:1}} );
        result = unagg(r)
        for (i=0; i< result.length; i++) {
            print("\t\t" + result[i].sum + " migrations failed in step " + result[i]._id);
        }
    }
    print("\t" + totalChunks + " different chunks were involved in " + (successful ? " completed" : " failed")    + " migrations.");
    if (!detailsNS && verbose < 4) return;
    if (successful) return;
    print("\n\t\t--- Details on chunks that failed more than once!---");
    r = chlog.aggregate(m1, p1, p2, grp1, {$sort:{count:1}} );
    result = unagg(r)
    result.forEach(function(ch) { 
        if (Math.round(ch.totalTime/1000)==0) return;
        if (ch.count==1) {
            if (verbose > 4) print("Chunk " + tojson(ch._id.mn) + "-" + tojson(ch._id.mx) + " failed in step " + ch.highestStep + " (" + Math.round(ch.totalTime/1000) + "sec)");
            return;
        }
        print("Chunk " + ( verbose > 4 ? tojson(ch._id.mn) + "-" + tojson(ch._id.mx) + "\n\t\t" : "")
                 + "failed " + ch.count + " times (" + Math.round(ch.totalTime/1000) + " sec total)" + " getting to step " + ch.highestStep 
                 + " from " + shortDate(ch.fromTime) + " till " + shortDate(ch.toTime));
    })
}

/* analyze changelog collection in config DB for recent activity */
whatSharded = function (dbname, options) {
   debug = false;
   verbose = 0;
   showSplits = true;
   showMigrations = true;
   if ( dbname == undefined || dbname == "usage" ) { 
           print("\nwhatSharded(configDBname, [ { options} ])  - print information about Sharded cluster from configDB" );
           print("\nOptions available: \n"
             + "\n\t verbose  :  <num>  \t for more details (0-5)"
             + "\n\t details  :  <ns>   \t for details just for one namespace"
             + "\n\t showSplits :<bool> \t show all splits (default: true)"
             + "\n\t showMigrations:<bool> \t show migrations (default true)"
           ); 
           if (dbname == undefined) print("\nConfig dbname is required");
           return;
   } else if ( options == undefined ) print("Options are available, type whatSharded('usage') for info");
   else if ( ! isObject( options ) ) verbose = options; /* true, false or numbers work */
   else {  /* it's an object */
       verbose = options.verbose || verbose;
       debug = options.debug || debug;
       showSplits = options.splits || showSplits;
       showMigrations = options.migrations || showMigrations;
   }

   /* define variables for all config db collections */
   var chlog = db.getSiblingDB(dbname).getCollection("changelog");
   var shards = db.getSiblingDB(dbname).getCollection("shards");
   var dbs = db.getSiblingDB(dbname).getCollection("databases");
   var colls = db.getSiblingDB(dbname).getCollection("collections");
   var sets = db.getSiblingDB(dbname).getCollection("settings");
   var locks = db.getSiblingDB(dbname).getCollection("locks");

   var t1=chlog.find({},{time:1,_id:0}).sort({time:-1}).limit(1).toArray()[0].time
   var maxts = t1;

   /* ****   Basic intro section ****  */
   print("\nConfig DB '" + dbname + "'.\nLast ts is \t" + (new Date(maxts)).toISOString());
   var shs = shards.count();
   print("\nThere are " + shs + " shards");

   var shdbs = dbs.count({partitioned:true});
   if (shdbs == 0) { 
      print("\nNo DB is sharded");
      return;
   } else if (shdbs == 1) print("\nOne db is sharded");
   else print("\n" + shdbs + " dbs are sharded");

   /* ****   Sharded collections ****  */
   var nss = colls.find({dropped:false}).sort({_id:1}).toArray();
   var droppednss = colls.find({dropped:true}).sort({_id:1}).toArray();
   var someHashed = false;
   print("\n" + nss.length + " sharded collections");

   /* ****  Balancer  ****  */
   print("\nBalancer:\n");
   var b = sets.findOne({_id:"balancer"});
   var balState = b==null ? true : !b.stopped;
   print("\t Currently enabled:  " + (balState ? "YES" : "no"));

   var br = locks.findOne({_id:"balancer"});
   var balRun = (br==null || br.state==0) ? false : true;
   print("\t Currently running:  " + (!balRun ? "no" : "YES"));
   if (debug) print("**** ", tojson(b), balState, tojson(br), balRun);
   if ( b!=null && b.hasOwnProperty("activeWindow")) {
       print("\t\tBalancer active window is set between " 
                     + b.activeWindow.start + " and " 
                     + b.activeWindow.stop );
   }

   /* ****  Changelog  ****  */
   var start=chlog.find().limit(-1).sort({time:1}).toArray()[0].time;
   var end=chlog.find().limit(-1).sort({time:-1}).toArray()[0].time;
   var durHrs=Math.round((end-start)/1000/60/60*100)/100;
   var durDays=Math.round(durHrs/24*100)/100;
   print("\nChangelog covers " + durHrs  + "hours (" + durDays + " days) from \n\t" + start.toISOString() + "    to \t" + end.toISOString());

   print("\nActivity details grouped:");
   var y = chlog.aggregate( {$sort:{ns:1,time:1}}, 
                            {$group:{_id:{ns:"$ns",min:{$ifNull:["$details.min","$details.before.min"]},max:{$ifNull:["$details.max","$details.before.max"]}}, 
                                     earliest:{$min:"$time"}, 
                                     docs:{$push:"$$ROOT"}}},
                            {$sort:{earliest:1,"_id":1}});
   x = unagg(y);
   var prevns="";
   x.forEach(function(ch) { 
       if (ch._id.ns=="config.version") {
           print("Updated version at " + ch.earliest.toISOString());
           prevns=ch._id.ns;
           return;
       }
       if (ch._id.ns != prevns) {
           print("Namespace " + ch._id.ns);
           prevns=ch._id.ns;
       }
       print("\tChunk is " + tojson(ch._id.min) + " -->> " + tojson(ch._id.max));
       ch.docs.forEach( function(doc) {
           details=" ";
           if (doc.what.slice(0,4)=="move") {
                details+= "Move: "
           } else {
                details+= doc.what;
           }
           for (i in doc.details) {
               if (i!="min" && i!="max" && i!="before") {
                   details = details + " " + i +" "+doc.details[i] + "; ";
               }
           }
           print("\t"+doc.time.toISOString()+"\t"+doc.what+details);
       }); 
   });
   
   var actions = chlog.aggregate(
                  {$sort:{time:1}},
                  {$project:{_id:0,ns:1,
                        chunk:{ns:"$ns",min:{$ifNull:["$details.min","$details.before.min"]},max:{$ifNull:["$details.max","$details.before.max"]}},
                        what:{$cond:{if:{$eq:[{$substr:["$what",0,4]},"move"]},then:{$substr:["$what",10,2]},else:"$what"}},
                        move:{$cond:{if:{$eq:[{$substr:["$what",0,4]},"move"]},then:true,else:false}},
                        aborted:{$cond:{if:{$eq:["$details.note","aborted"]},then:true,else:false}} } }
   );
}
