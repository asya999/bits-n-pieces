load("utils.js");

function runTest(optype, offset, numDocs, size, indexed, bench, threads, dur) {

 numIterations = 3;
 for (x=0; x< numIterations; x++) {
     // print("\n" + optype + "s starting at " + offset + " docs of size " + size + " " + (indexed ? "indexed     " : "not indexed ") + "via " + (bench ? "benchRun": "direct  ") + " and " + threads + " threads over " + dur + " seconds");

     var dXXX = new Array( size-46 ).toString();
     var d = {"field": dXXX, x: 9};
     var mongoHost = db.getMongo().toString().split(" ")[2];
     // print("Mongo host is " + mongoHost);
     t=db.test;
     // if starting at 0 then drop collection
     if (offset == 0) {
         t.drop();
     }
     t.ensureIndex({a:1}, {sparse:true});
     if (indexed) {
         t.ensureIndex({x:1}, {sparse:true});
         t.ensureIndex({x:1, _id:-1} );
         t.ensureIndex({x:-1, a:1, _id:1} );
     }
   
     var atStart = t.find().count();
     // print ("Number of documents to start with: " + atStart);
  
     var start = new Date()
     var end = new Date()
         
     var ops = []
     if (bench) {
        ops = [ {
                  ns : t.getFullName(),
                  safe : false
              } ];
        if (optype == "upsert") { 
               ops[0].op = "update";
               ops[0].upsert = true;
               ops[0].query = {a:"x"};
               ops[0].update = d;
        }
        if (optype == "insert") { 
               ops[0].op = "insert";
               ops[0].doc = d;
        }
        // printjson(ops);
        var rdoc = { parallel : threads, seconds : dur, ops : ops , host : mongoHost };
        // printjson(rdoc);
        start = new Date()
        var res = benchRun ( rdoc );
        end = new Date()
        //  printjson( res );
        if (res.errCount > 0) { print ("Returned error from benchRun" + tojson(res)); }
        // print("Op rate: " +  res[ops[0].op] );
     } else {
        start = new Date()
        for ( i=offset; i<offset+numDocs; i++ ) {
            // d._id = i;
            // if (i%5 == 0) {
                // d.x = i%5;
            // }
            if (optype=="insert") {
                t.insert(d);
            }
            if (optype=="upsert") {
                t.update({a:"x"},d,true);
            }
        }
        end = new Date()
     }
  
     var le = db.runCommand({getlasterror:1});
     // printjson(le);
     if (le.err != null) { print ("GLE returned non-null! " + tojson(le)); }
     var real_end = new Date();
     diffTime = real_end - end;
     // print("Overhead diff and GLE wait is : " + diffTime);
     var timeTook = (end-start)/1000;
     // print ("Data is " + optype + " finished  ");
     var atEnd = t.find().count();
     var totalIn = atEnd - atStart;
     // print ("Number of documents at start " + atStart + " at the end is: " + atEnd);
     // print("\n" + optype + "s starting at " + offset + " docs of size " + size + " " + (indexed ? "indexed     " : "not indexed ") + "via " + (bench ? "benchRun": "direct  ") + " and " + threads + " threads over " + dur + " seconds");
     // print (timeTook + " seconds, " + totalIn +  " docs. Rate: " + totalIn/timeTook + " ops.");
     // if (timeTook > 21) { print ("-- This round took " + timeTook + "seconds"); }
     print (threads + "\t" + (indexed ? " 5 " : " 2 ") + optype + "s \t" + Math.round(1000*totalIn/timeTook)/100 + "\t " + totalIn);
     // results.push(Math.round(1000*totalIn/timeTook)/1000);
    }
    // avg = Math.round((results[0]+results[1]+results[2])/3);
    // results.sort();
    // med = Math.round(results[1]);
}

// var numDocs =  2000000;
var offset =  0;
var numDocs =  200000;
var bench = true;
var duration = 20;

// runTest(optype, offset, numDocs, size, indexed, bench, threads, dur) {
// runTest("insert", 0, 3000, 100, false, true, 1, 5);
// runTest("upsert", 0, 3000, 100, false, true, 1, 5);
// runTest("insert", 1000, 1000, 1000, false, false, 2, 5);
// runTest("insert", 1000, 1000, 1000, false, true, 4, 5);

var index_true = true;   // whether there are indexes
var index_false = false;

var size = 100;   // size of document
print("\n *** Size " + size);
var threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

size = 1000;
print("\n *** Size " + size);
threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

size = 10240;
print("\n *** Size " + 10240);
threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

size = 102400;
print("\n *** Size " + 102400);
threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

offset = 100;
size = 100;   // size of document
print("\n *** Size " + 100);
var threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

size = 1000;
print("\n *** Size " + 1000);
threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

size = 10240;
print("\n *** Size " + 10240);
threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

size = 102400;
print("\n *** Size " + 102400);
threads = 1;  // number of threads
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 2;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

threads = 4;
runTest("insert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_false, bench, threads, duration);
runTest("insert", offset, numDocs, size, index_true, bench, threads, duration);
runTest("upsert", offset, numDocs, size, index_true, bench, threads, duration);

