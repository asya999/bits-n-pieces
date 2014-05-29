function (verbose) {
     var ops=db.currentOp(verbose);
     if (ops.ok == 0) { throw "Error running current Op!"; }
     if (ops.inprog.length == 0) {
        print("Nothing running!");
        return;
     }
     print("There are " + ops.inprog.length + " processes in progress");
     var active=ops.inprog.filter(function(i) { if (i["active"]) return i; } );
     var inactive=ops.inprog.filter(function(i) { if (!i["active"]) return i; } );
     var waiting=active.filter(function(i) { if (i["waitingForLock"]) return i; } );
     var running=active.filter(function(i) { if (!i["waitingForLock"]) return i; } );
     print("\n\t" + inactive.length + " are inactive");
     print("\t" + active.length + " are active");
     print("\t\t" + running.length + " are running");
     print("\t\t" + waiting.length + " are waiting for lock");

     if (ops.inprog[0].opid.indexOf(":") > -1) {
           /* sharding is on */
           print("\nDetails by shard (running)");
           var shards={};
           inactive.forEach(function(op) {
                sh=op.opid.slice(0,op.opid.indexOf(":"));
                if (!shards.hasOwnProperty(sh)) {
                    shards[sh] = [];
                }
                shards[sh].push(op);
           });
           running.forEach(function(op) {
                sh=op.opid.slice(0,op.opid.indexOf(":"));
                if (!shards.hasOwnProperty(sh)) {
                    shards[sh] = [];
                }
                shards[sh].push(op);
           });
           waiting.forEach(function(op) {
                sh=op.opid.slice(0,op.opid.indexOf(":"));
                if (!shards.hasOwnProperty(sh)) {
                    shards[sh] = [];
                }
                shards[sh].push(op);
           });
           for (i in shards) {
               shards[i].forEach(function(op) {
                   var what = "inactive  ";
                   if (op.active && !op.waitingForLock) what = "is running";
                   if (op.active && op.waitingForLock) what = "is waiting";
                   print("\t\tShard " + i + ":\t " + op.op + "\t is " + what + "\t\t" + op.ns);
               });
           }
     }

     print("\nDetails by namespace");

     print("\nDetails by op");

}
