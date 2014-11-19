var whatsUp = function (options) {
     if ( options == undefined ) {
       print("Options are available, type whatsUp('usage') for info");
       options = {verbose:false};
     }
     if ( ! isObject( options ) ) options = {verbose:options};
     verbose = options.verbose || false;
     debug = options.debug || false;
     inactiveOnly = options.inactiveOnly || false;
     activeOnly = options.activeOnly || false;
     runningOnly = options.runningOnly || false;
     waitingOnly = options.waitingOnly || false;
     sortBy= options.sortBy || "desc";
     allOps=(!activeOnly && !runningOnly && !waitingOnly && !inactiveOnly);

     if(debug) print(sortBy);

     var ops=db.currentOp(verbose);
     if (ops.ok == 0) { throw "Error running current Op!"; }
     if (ops.inprog.length == 0) {
        print("Nothing running!");
        return;
     }
     ops.inprog=opinprog;
     ops.inprog=ops.inprog.sort(dynamicSort(sortBy));
     print("There are " + ops.inprog.length + " processes in progress");
     /* ops are active or inactive */
     var active=ops.inprog.filter(function(i) { if (i["active"]) return i; } );
     /* if active they can be running or waiting for lock */
     var running=active.filter(function(i) { if (!i["waitingForLock"]) return i; } );
     var waiting=active.filter(function(i) { if (i["waitingForLock"]) return i; } );
     var inactive=ops.inprog.filter(function(i) { if (!i["active"]) return i; } );
     running=running.sort(dynamicSort(sortBy));
     waiting=waiting.sort(dynamicSort(sortBy));
     inactive=inactive.sort(dynamicSort(sortBy));
     print("\n\t" + inactive.length + " are inactive");
     print("\t" + active.length + " are active");
     print("\t\t" + running.length + " are running");
     print("\t\t" + waiting.length + " are waiting for lock");
     var fields = [ "opid", "op", "ns", "query", "desc", "threadId", "numYields", "secs_running"];
     var pads =   [ 10,    7,     22,    20,     18,      16,        5,          5 ];
     var shards = (ops.inprog[0].opid.indexOf(":")>-1);
     if (shards)
         print(
" status   |          shard          |   opid     |   op    |          ns            |        query         |      desc          |     threadId     | nYield| secsR |      client_s         |   connectionId  |   locked w,r, ww, wr  | "
         );
     else
         print(
" status   |   opid     |   op    |          ns            |        query         |         insert       |      desc          |     threadId     | nYield| secsR |   locked w,r, ww, wr  | "
         );
     /* show active-running, active-waiting, inactive */
     if (allOps || activeOnly || runningOnly) {
         status = " running ";
         outputAll(running, status, fields, pads, debug);
     }
     if (allOps || activeOnly || waitingOnly) {
         status = " waiting ";
         outputAll(waiting, status, fields, pads, debug);
     }
     if (allOps || inactiveOnly) {
         status = " inactive";
         outputAll(inactive, status, fields, pads, debug);
     }
}
var outputAll = function (ops, status, fields, pads, debug) {
         var output="";
         ops.forEach(function(op) {
            shard="0";
            if (debug) printjson(op);
            output=status + " | ";
            for (i=0; i< fields.length; i++) {
               if (fields[i]=="opid" && op.opid.indexOf(":") > -1) {
                   shard=op.opid.slice(0,op.opid.indexOf(":"));
                   output+=pad(shard,23);
                   output+=" | ";
                   opid=op.opid.slice(op.opid.indexOf(":")+1, op.opid.length);
                   output+=pad(opid,pads[i]);
               } else output+=pad(op[fields[i]],pads[i]);
               output+=" | ";
            }
            if (shard != "0") {
               output+=pad(op["client_s"],20);
               output+=" | ";
               output+=pad(op["connectionId"],16);
               output+=" | ";
            }
            output+=pad(op["lockStats"]["timeLockedMicros"]["w"],6);
            output+=",";
            output+=pad(op["lockStats"]["timeLockedMicros"]["r"],6);
            output+=",";
            output+=pad(op["lockStats"]["timeAcquiringMicros"]["w"],6);
            output+=",";
            output+=pad(op["lockStats"]["timeAcquiringMicros"]["r"],6);

            print(output);
         });
}
