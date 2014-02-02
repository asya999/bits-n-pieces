    ops = [
    // this sets up an array of operations benchRun will run
       { 
            // possible operations include find, findOne, update, insert, delete, etc.
            op : "insert" ,   
            // your db.collection
            ns : "test.foo" ,  
            safe : false,
            doc : { textField: "texthereetcetcewtrljsdfjdslfjglds", 
                               intField: 1 }
       }
    ]
    
    // print(ops);
    for ( x = 1; x<=16; x+=1){
        y = Math.max( x-5, 1);
        // actual call to benchRun, each time using different number of threads
        res = benchRun( { parallel : y ,   // number of threads to run in parallel
                          host : "localhost:44444",
                          seconds : 5 ,    // duration of run can be fractional seconds
                          ops : ops        // array of operations to run (see above)
                        } )
        // res is a json object, easiest way to see everything in it is:
        // printjson( res )
        print( "threads: " + y + "\t inserts/sec: " + res.insert )
    //    break;
    }

