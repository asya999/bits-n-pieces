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
             /* these are not done yet
             + "\n\t grain:'hour' or 'day' \t show migrations with dates (default: false) "
             + "\n\t showSplits :<bool> \t show all splits (default: false)"
             + "\n\t showMigrations:<bool> \t show migrations (default true)"
             */
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

   var chlog = db.getSiblingDB(dbname).getCollection("changelog");
   var chunks = db.getSiblingDB(dbname).getCollection("chunks");
   var shards = db.getSiblingDB(dbname).getCollection("shards");
   var dbs = db.getSiblingDB(dbname).getCollection("databases");
   var colls = db.getSiblingDB(dbname).getCollection("collections");
   var tags = db.getSiblingDB(dbname).getCollection("tags");
   var sets = db.getSiblingDB(dbname).getCollection("settings");
   var locks = db.getSiblingDB(dbname).getCollection("locks");
   var pings = db.getSiblingDB(dbname).getCollection("lockpings");
   var mongos = db.getSiblingDB(dbname).getCollection("mongos");

   var t1=chlog.find({},{time:1,_id:0}).sort({time:-1}).limit(1).toArray()[0].time
   var t2=mongos.find({},{_id:0,ping:1}).sort({ping:-1}).limit(1).toArray()[0].ping
   if (t2==undefined) t2=0;
   var t3=pings.find({},{_id:0,ping:1}).sort({ping:-1}).limit(1).toArray()[0].ping
   if (t3==undefined) t3=0;
   var t4=locks.find({},{_id:0,when:1}).sort({when:-1}).limit(1).toArray()[0].when
   if (t4==undefined) t4=0;

   /* ****   Basic intro section ****  */
   var maxts = Math.max(t1,t2,t3,t4);
   print("\nConfig DB '" + dbname + "'.\nLast ts is \t" + (new Date(maxts)).toISOString());
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
      if (verbose) {
          shards.find().forEach(function(s) {
              print("\t  _id: " + s._id);
              if (verbose>1) print("\t  host: " + s.host + "  ");
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

   /* ****   Sharded collections ****  */
   var nss = colls.find({dropped:false}).toArray();
   var someHashed = false;
   print("\nSharded collections and their keys are:");
   nss.forEach(function(c) { 
      var addl="";
      if (verbose>0) {
          var cshs = chunks.distinct("shard",{ns:c._id});
          addl = "\tdata is located on " + cshs.length + " shards";
          var bigs = chunks.count({ns:c._id, jumbo:true});
          if (bigs > 0) addl += "\n\tWARNING: " + bigs + " jumbo chunks in collection " + c._id;
      }
      print("\t" + c._id + "\t\t" + tojson(c.key) + addl);
      if (verbose) {
           for (f in c.key) {
                 if (c.key[f]=="hashed") {
                    print("\t\t" + c._id + "\t\t is using a hashed shard key.");
                    someHashed = true;
                 }
                 break;
           }
      }
      if ( chunks.count({ ns:c._id }) == 0 ) {
          print("\t\tWARNING: Collection " + c._id + " is sharded and not dropped, but has ZERO chunks recorded");
      }
   });

   /* ****   TAGS ****  */
   var ntags=tags.count();
   if (ntags > 0) {
      print("\nTag aware sharding is being used, " + ntags + " ranges are set.");
      if (verbose>0) {
          var ct = tags.distinct("ns");
          var nt = tags.distinct("tag");
          print("\t" + ct.length + " collections are using " + nt.length + " tags.");
      }
   }

   /* ****  Chunk Distribution  ****  */
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
   print("\tTotal chunks: " + chunks.count());

   /* ****  Chunk Size  ****  */
   var ch = sets.findOne({_id:"chunksize"});
   if (ch==null || ch.value==64) print("\nDefault chunk size is being used.");
   else print("\nUsing NON-default chunk size!  Currently chunk size is set to " + ch.value + "MB");

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
   if (verbose) {
       if ( br!=null && br.state>0 ) {
           print("\t\tBalancer lock is in state " + br.state + ". " + br.why);
           print("\t\t\t was last updated at    " + br.when);
           if (verbose>1) {
               print("\t\t\t by    " + br.process);
               var lastPing=pings.findOne({_id:br.process});
               if (lastPing==null || lastPing.ping==0) 
                    print("WARNING: balancer has a lock but there is no ping from this process!");
               else {
                    print("\t\tLast ping from this process was " + lastPing.ping);
               }
               var lk = locks.find({state:{$ne:0},_id:{$ne:"balancer"}}).toArray();
               if (lk.length > 0) {
                  print("\tThere " + (lk.length==1?"is ":"are ") 
                          + lk.length + " collection metadata lock(s) taken:");
                  lk.forEach(function(c) {
                     print("\t\tCollection:" + c._id + "\n\t\t\twhy " + c.why 
                                            + "\n\t\t\twho " + c.who + "\n\t\t\tlast ping:" + c.when);
                  });
               }
           }
       }
   }

   /* ****  Mongos    ****   */
   x = mongos.aggregate({$group:{_id:"$mongoVersion",c:{$sum:1},last:{$max:"$ping"}}},
                        {$sort:{_id:1}},
                        {$project:{ _id:0,mongosVersion:{$ifNull:["$_id","pre-2.4.0"]}, 
                                    count:"$c", lastPing:"$last"}});
   ms = unagg(x);
   if (verbose) {
       print("\nMongos:")
       print("\n\tThere are " + ms.length + " different versions of Mongos that have checked in.")
       if (verbose>1) {
           ms.forEach(function(mongos) {
               print("\t\tVersion: " + mongos.mongosVersion + ", " 
                      + mongos.count + " processes, last checkin: " + mongos.lastPing);
           });
       }
   }
   if (mongos.count({mongoVersion:{$exists:false}})>0 && someHashed) {
       print("\nWARNING: Mongos of pre-2.4.0 version exist in mongos collection " 
                               + "\n\tand there are hash key sharded collections.");
       if (!verbose) print("\tUse verbose option to see when old mongos last checked in.");
   }

   /* ****  Changelog  ****  */
   var start=chlog.find().limit(-1).sort({time:1}).toArray()[0].time;
   var end=chlog.find().limit(-1).sort({time:-1}).toArray()[0].time;
   var durHrs=Math.round((end-start)/1000/60/60*100)/100;
   var durDays=Math.round(durHrs/24*100)/100;
   print("\nChangelog covers " + durHrs  + "hours (" + durDays + " days) from \n\t" + start.toISOString() + "    to \t" + end.toISOString());

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
                 + x[0].migrations + " successful migrations, out of " 
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
                      + c.migrationFailures + " failed.");
      if (debug) print("*** nummoves details" +  nummoves +" "+ detailsNS);
      var moves = chlog.find({ns:c._id, what:"moveChunk.commit"},{time:1,details:1}).sort({time:1}).toArray();
      if (nummoves > moves.length) nlimit=Math.round(moves.length-1);
      else nlimit=nummoves/2;
      if (debug) print("**** moves.length" + moves.length);
      if ( detailsNS && detailsNS == c._id || verbose > 0) {
         for ( m = 0; m < moves.length; m++ ) { 
            if (m==0) print("\tSuccessful migrations:");
            if (m==0) print("\t    earliest at: " + moves[m].time.toISOString() 
                       + "\n\t\tfrom  " + moves[m].details.from + "\t to " + moves[m].details.to);
            if ( verbose>1 ) {
               if ( (m > 0 && m < nlimit) || ( m > (moves.length-nlimit) && m< moves.length) ) {
                   if (withdate || verbose>2) print("\t\tfrom  "
                                    + moves[m].details.from + "\t to " + moves[m].details.to 
                                    + " \t " + moves[m].time.toISOString());
                   else print("\t\tfrom  " 
                                    + moves[m].details.from + "\t to " + moves[m].details.to);
               } else if ( m == nlimit && nummoves < moves.length ) 
                                    print("\t\t\t\t... " + (moves.length-nlimit*2-2) + " more");
            }
            if (m==moves.length-1) print("\t    latest   at: " + moves[m].time.toISOString()); 
         }
      }
   });
   
   /* ****  Chunk sequences  ****  */
   collectionsToDo = [];
   lastChunk = "";
   if (detailsNS) collectionsToDo.push(detailsNS);
   else if (verbose > 0) collectionsToDo = chunks.distinct("ns")
   if (debug) print("*** " + tojson(collectionsToDo));
   if (collectionsToDo.length>0) print("\nSequential chunk sequences:");
   collectionsToDo.forEach(function( NS ) {
      print("\t" + NS + ":  ");
      var cl=colls.findOne({_id:NS, dropped:false});
      if (cl == null) {
          print("WARNING: didn't find collection " + NS);
          return;
      }
      for (f in cl.key) {
          if (cl.key[f]=="hashed") {
               print("\t\t" + cl._id + "\t\t is using a hashed shard key.");
               continue;
          } 
      }
      divFactor = shs * ( !verbose ? 10 : (verbose==1 ? 20 : 100 ) )   /* to get 1% 5% or 10% of */
      seqThreshold = Math.max(Math.round(chunks.count({ns:NS})/divFactor),10);  /* numChunks div by numShards */
     
      if (debug) print("*** factor threshold " + divFactor + " " + seqThreshold);
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
                      print("\t\t\t"+count+" sequential chunk ranges on shard "+current + isLast);
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
