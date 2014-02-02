unagg = function(cursorOrResultDoc) {
   if (cursorOrResultDoc.hasOwnProperty("result")) return cursorOrResultDoc.result;
   else return cursorOrResultDoc.toArray();
}

/* analyze changelog collection in config DB for recent activity */
wts = function (dbname, options) {
   debug = false;
   verbose = 0;
   detailsNS = "";
   nummoves = 20;
   withdate = false;
   grain = null;
   showSplits = false;
   showMigrations = true;
   if ( dbname == undefined || dbname == "usage" ) { 
           print("\nwts(configDBname, [ { options} ])  - print information about Sharded cluster from configDB" );
           print("\nOptions available: \n"
             + "\n\t verbose  :  <num>  \t for more details (0-5)"
             + "\n\t details  :  <ns>   \t for details just for one namespace"
             + "\n\t nummoves :  <ns>   \t number of migrations to show in detail (default: 20, 50 if verbose>0)"
             + "\n\t withdate :  <bool> \t show migrations with dates (default: false) "
             + "\n\t grain:'hour' or 'day' \t show migrations with dates (default: false) "
             + "\n\t showSplits :<bool> \t show all splits (default: false)"
             + "\n\t showMigrations:<bool> \t show migrations (default true)"
           ); 
           if (dbname == undefined) print("\nConfig dbname is required");
           return;
   } else if ( options == undefined ) print("Options are available, type wts('usage') for info");
   else if ( ! isObject( options ) ) verbose = options; /* true, false or numbers work */
   else {  /* it's an object */
       verbose = options.verbose || 0;
       debug = options.debug || false;
       detailsNS = options.details || "";
       nummoves = options.nummoves || (verbose ? verbose*50 : 20);
       withdate = options.withdate || false;
       grain = ( options.hour ? "hour" : ( options.day ? "day" : undefined ) );
       showSplits = options.splits || false;
       showMigrations = options.migrations || true;
   }
   if (debug) print("***NS is " + detailsNS);
   var chlog = db.getSiblingDB(dbname).getCollection("changelog");
   var chunks = db.getSiblingDB(dbname).getCollection("chunks");
   var shards = db.getSiblingDB(dbname).getCollection("shards");
   var dbs = db.getSiblingDB(dbname).getCollection("databases");
   var colls = db.getSiblingDB(dbname).getCollection("collections");
   var tags = db.getSiblingDB(dbname).getCollection("tags");
   var stts = db.getSiblingDB(dbname).getCollection("settings");
   var locks = db.getSiblingDB(dbname).getCollection("locks");
   var pings = db.getSiblingDB(dbname).getCollection("lockpings");
   var mongos = db.getSiblingDB(dbname).getCollection("mongos");

   var shs = shards.count();
   print("\nThere are " + shs + " shards");
   if (verbose>0) {
      var reps = 0;
      var tagged = 0;
      shards.find().forEach(function(s) {  
         if ( s.host.indexOf("/") > 0 ) reps += 1;
         if ( s.hasOwnProperty("tags") && s.tags.length > 0 ) tagged += 1;
      });
      print("\t" + reps + " out of " + shs + " shards are replica sets");
      if ( tagged > 0 ) print("\t" + tagged + " of " + shs + " shards have tags set");
      if (verbose>1) {
          shards.find().forEach(function(s) {
              print("\t{ _id: " + s._id + ",\n\t  host: " + s.host + " }");
          });
      }
   }

   var shdbs = dbs.count({partitioned:true});
   if (shdbs == 0) { 
      print("\nNo DB is sharded");
      return;
   } else if (shdbs == 1) print("One db is sharded");
   else print("\n" + shdbs + " dbs are sharded");
   if (verbose>0) {
      dbs.find({partitioned:true}).forEach(function(d) { print("\t" + d._id + "\t has its primary on \t" + d.primary); });
   }

   var nss = colls.find({dropped:false}).toArray();
   print("\nSharded collections and their keys are:");
   nss.forEach(function(c) { 
      var addl="";
      if (verbose>0) {
          var cshs = chunks.distinct("shard",{ns:c._id});
          addl = "\tdata is located on " + cshs.length + " shards";
      }
      print("\t" + c._id + "\t\t" + tojson(c.key) + addl);
      if ( chunks.count({ ns:c._id }) == 0 ) {
          print("\t\tWARNING: Collection " + c._id + " is sharded and not dropped, but has ZERO chunks recorded");
      }
   });

   var ntags=tags.count();
   if (ntags > 0) {
      print("\nTag aware sharding is being used, " + ntags + " ranges are set.");
      if (verbose>0) {
          var ct = tags.distinct("ns");
          var nt = tags.distinct("tag");
          print("\t" + ct.length + " collections are using " + nt.length + " tags.");
      }
   }

   print("\nChunk distribution:");
   c = chunks.aggregate({$group:{_id:{ns: "$ns",shard:"$shard"}, c:{"$sum":1}}},
                        {$sort:{"_id":1}},
                        {$project:{ns:"$_id.ns", shard:"$_id.shard", count:"$c", _id:0}}
   );
   ch = unagg(c);
   coll = "";
   ch.forEach(function(nsh) { 
       if ( nsh.ns != coll ) {
            print( "\t " + nsh.ns + ":");
            coll = nsh.ns;
       }
       print( "\t\t " + nsh.shard + ":  \t " + nsh.count);
   });

   print("\nBalancer:\n");
   var b = stts.findOne({_id:"balancer"});
   var balState = b==null ? true : !b.stopped;
   print("\t Currently enabled:  " + (balState ? "YES" : "no"));

   var br = locks.findOne({_id:"balancer"});
   var balRun = (br==null || br.state==0) ? false : true;
   print("\t Currently running:  " + (!balRun ? "no" : "YES"));
   if (debug) print("**** ", tojson(b), balState, tojson(br), balRun);
   if (verbose) {
       if ( b!=null && b.hasOwnProperty("activeWindow")) {
           print("\t\tBalancer active window is set between " 
                         + b.activeWindow.start + " and " 
                         + b.activeWindow.stop );
       }
       if ( br!=null && br.state>0 ) {
           print("\t\tBalancer lock is in state " + br.state + ". " + br.why);
           print("\t\t\t was last updated at " + br.when);
           if (verbose>1) {
               var lastPing=lockpings.findOne({_id:br.process});
               if (lastPing==null || lastPing.ping==0) 
                    print("WARNING: balancer has a lock but there is no ping from this process!");
               else {
                    print("\t\tLast ping from this process was " + lastPing.ping);
               }
           }
       }
   }

   var start=chlog.find().limit(-1).sort({time:1}).toArray()[0].time;
   var end=chlog.find().limit(-1).sort({time:-1}).toArray()[0].time;
   var durHrs=Math.round((end-start)/1000/60/60*100)/100;
   var durDays=Math.round(durHrs/24*100)/100;
   print("\nChangelog covers " + durHrs  + "hours (" + durDays + " days) from \n\t" + start + "    to \t" + end);

   print("\nActivity details:");
   /* overall breakdown in changelog */
   var y = chlog.aggregate( {$group: { _id:null, 
             collections: {$addToSet:"$ns"},
             splits:{$sum:{$cond:[{$eq:["$what","split"]},1,0]}},
             migrationAttempts:{$sum:{$cond:[{$eq:["$what","moveChunk.start"]},1,0]}},
             migrations:{$sum:{$cond:[{$eq:["$what","moveChunk.commit"]},1,0]}}
      } });
   x = unagg(y);
   print("\n" + x[0].collections.length + " collections had activity in the 'changelog'. ");
   print("\t" + x[0].splits + " splits, " 
                 + x[0].migrations + " migrations, out of " 
                 + x[0].migrationAttempts + " attempts.\n");
   /* for each collection, find what's been going on in the changelog */
   var z=chlog.aggregate(
      {$group: {_id:"$ns",
             splits:{$sum:{$cond:[{$eq:["$what","split"]},1,0]}},
             migrationAttempts:{$sum:{$cond:[{$eq:["$what","moveChunk.from"]},1,0]}},
             migrationFailures:{$sum:{$cond:[{$and:[ {$eq:["$details.note","aborted" ]},{$eq:["$what","moveChunk.from"]}]} ,1,0]}},
             migrations:{$sum:{$cond:[{$eq:["$what","moveChunk.commit"]},1,0]}}
      } });
   res = unagg(z);
   res.forEach(function(c) { 
      print("\t" + c._id + ": \t" + c.splits + " splits; \t" 
                      + c.migrations + " successful migrations out of " 
                      + c.migrationAttempts +  " attempts.  " 
                      + c.migrationFailures + " show failed.");
      if (debug) print("***" +  nummoves +" "+ detailsNS);
      var moves = chlog.find({ns:c._id, what:"moveChunk.commit"},{time:1,details:1}).sort({time:1}).toArray();
      if (debug) print("****" + moves.length);
      if (verbose>0  || detailsNS && detailsNS == c._id ) {
         if ( moves.length > 0 ) { 
            print("\tSuccessful migrations:");
            print("\t    earliest at: " + moves[0].time 
                       + "\n\t\t from " + moves[0].details.from + " to " + moves[0].details.to);
            if (verbose>1  || detailsNS && detailsNS == c._id ) {
               for (i=1; i<(nummoves/2) && i<moves.length-1; i++) { 
                   if (debug) print("**** " + i);
                   if (withdate) print("\t\t\tfrom  "
                                    + moves[i].details.from + "\t to " + moves[i].details.to 
                                    + " \t " + moves[i].time);
                   else print("\t\tfrom  " 
                                    + moves[i].details.from + "\t to " + moves[i].details.to);
               }
               if (moves.length>nummoves) print("\t\t\t\t... " + moves.length-nummoves+1 + " more");
               for (i=Math.max(moves.length,moves.length-(nummoves/2)); i<moves.length-1; i++) {
                   if (debug) print("**** " + tojson(moves));
                   if (debug) print("**** " + i + " " + nummoves);
                   if (withdate) print("\t\t\tfrom  " 
                                    + moves[i].details.from + "\t to " + moves[i].details.to + " " 
                                    + moves[i].time);
                   else print("\t\tfrom  " 
                                    + moves[i].details.from + "\t to " + moves[i].details.to);
               }
            }
               
            print("\t    latest   at: " + moves[moves.length-1].time 
                       + "\n\t\t from " + moves[moves.length-1].details.from + " to " + moves[moves.length-1].details.to);
         }
      }
   });
   
   collectionsToDo = [];
   lastChunk = "";
   if (detailsNS) collectionsToDo.push(detailsNS);
   else if (verbose > 0) collectionsToDo = chunks.distinct("ns")
   if (debug) print("*** " + tojson(collectionsToDo));
   if (collectionsToDo.length>0) print("\nSequential chunk sequences:");
   collectionsToDo.forEach(function( NS ) {
      print("\t" + NS + ":  ");
      divFactor = shs * ( !verbose ? 10 : (verbose==1 ? 20 : 100 ) )   /* to get 1% 5% or 10% of */
      if (debug) print("*** " + divFactor);
      seqThreshold = Math.max(Math.round(chunks.count({ns:NS})/divFactor),10);  /* numChunks div by numShards */
      grandTotal=0;
      count = 0;
      isLast = "";
      current = chunks.find({ns:NS},{shard:1}).sort({min:1}).limit(1).toArray()[0].shard;
      maxs = chunks.find({ns:NS},{shard:1}).sort({min:-1}).limit(1).toArray()[0]._id;
      chunks.find({ns:NS},{shard:1}).sort({_id:1}).forEach(function(c) {
          if (maxs == c._id) isLast="***";
          if (c.shard==current) {
             count++;   
          } else {
             if (count > seqThreshold) {
                  grandTotal+=1;
                  if (verbose > 1) 
                      print("\t\t\t"+count+" sequential chunks on shard "+current + isLast);
             }
             count=1;
             isLast="";
             current=c.shard;
          }
      });
      if (debug) print ("***" + " " + lastChunk);
      if (debug) print ("***" + " " + maxs);
      if (count > seqThreshold) { 
          if (verbose > 1) 
              print("\t\t\t" + count + " sequential chunks on shard " 
                              + current + isLast);
          grandTotal+=1;
      }
      if (grandTotal > 0) print("\t\t" + grandTotal + " sequences of chunks greater than " + seqThreshold);
   } );
}
