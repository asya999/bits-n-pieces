var STR_PAD_LEFT = 1;
var STR_PAD_RIGHT = 2;
var STR_PAD_BOTH = 3;

function pad(str, len, pad, dir) {

    if (str=="undefined") str="";
    if (typeof(str)=="undefined") str="";
    if (typeof(str)=="object") str=str.valueOf();
    if (typeof(len) == "undefined") { var len = 0; }
    if (typeof(pad) == "undefined") { var pad = ' '; }
    if (typeof(dir) == "undefined" && typeof(str)=='string' ) { var dir = STR_PAD_RIGHT; }
    if (typeof(dir) == "undefined" && typeof(str)=='number' ) { var dir = STR_PAD_LEFT; }
    if (typeof(str) == 'number') str=String(str);
    if (typeof(str) == 'object') str=tojson(str).toString();

    if (len + 1 >= str.length) {

        switch (dir){

            case STR_PAD_LEFT:
                str = Array(len + 1 - str.length).join(pad) + str;
            break;

            case STR_PAD_BOTH:
                var right = Math.ceil((padlen = len - str.length) / 2);
                var left = padlen - right;
                str = Array(left+1).join(pad) + str + Array(right+1).join(pad);
            break;

            default:
                str = str + Array(len + 1 - str.length).join(pad);
            break;

        } // switch

    } else {
        return str.slice(0,len);
    }

    return str;

}

var dynamicSort = function (property) {
    var sortOrder = 1;
    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

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
     var ops=db.currentOp(verbose);
     if (ops.ok == 0) { throw "Error running current Op!"; }
     if (ops.inprog.length == 0) {
        print("Nothing running!");
        return;
     }
     print("There are " + ops.inprog.length + " processes in progress");
     /* ops are active or inactive */
     var active=ops.inprog.filter(function(i) { if (i["active"]) return i; } );
     /* if active they can be running or waiting for lock */
     var running=active.filter(function(i) { if (!i["waitingForLock"]) return i; } );
     var waiting=active.filter(function(i) { if (i["waitingForLock"]) return i; } );
     var inactive=ops.inprog.filter(function(i) { if (!i["active"]) return i; } );
     print("\n\t" + inactive.length + " are inactive");
     print("\t" + active.length + " are active");
     print("\t\t" + running.length + " are running");
     print("\t\t" + waiting.length + " are waiting for lock");

     print(" status   \t |  opid    \t |     op    \t | threadId \t |  desc   \t |  other   \t | threadId  \t | nYield  \t |   secsR  \t | namespace\t | locked w,r, ww, wr | query   \t | ");
     var fields = [ "opid", "threadId", "desc", "op", "ns", "query", "numYields", "secs_running"];
     /* show active-running, active-waiting, inactive */
     if (allOps || activeOnly || runningOnly) {
         status = " running ";
         running.forEach(function(op) {
            output=status + " \t | ";
            for (i in op) {
               if ( fields.indexOf(i) == -1) continue;
               output+=op[i];
               output+=" \t| ";
            }
            print(output);
         });
     }
     if (allOps || activeOnly || waitingOnly) {
         status = " waiting ";
         waiting.forEach(function(op) {
            output=status + " \t | ";
            for (i in op) {
               if ( fields.indexOf(i) == -1) continue;
               output+=pad(op[i],,,);
               output+=" \t| ";
            }
            print(output);
         });
     }
     if (allOps || inactiveOnly) {
         status = " inactive";
         inactive.forEach(function(op) {
            output=status + " \t | ";
            for (i in op) {
               if ( fields.indexOf(i) == -1) continue;
               output+=op[i];
               output+=" \t| ";
            }
            print(output);
         });
     }

     var isMongos=false;
     if ( db.getSiblingDB('admin').isMaster().msg=='isdbgrid') isMongos=true;

     if ( isMongos ) {
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

}
