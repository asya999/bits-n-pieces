    ops = [
    // this sets up an array of operations benchRun will run
       { 
            // possible operations include find, findOne, update, insert, delete, etc.
            op : "insert" ,   
            // your db.collection
            ns : "test.foo" ,  
            safe : true,
            doc : { textField: "texthereetcetcewtrljsdfjdslfjglds", 
                               intField: 1 }
       }
    ]
    
    print(ops);
    for ( x = 1; x<=128; x*=2){
        // actual call to benchRun, each time using different number of threads
        res = benchRun( { parallel : x ,   // number of threads to run in parallel
                          seconds : 5 ,    // duration of run can be fractional seconds
                          ops : ops        // array of operations to run (see above)
                        } )
        // res is a json object, easiest way to see everything in it is:
        printjson( res )
        print( "threads: " + x + "\t inserts/sec: " + res.insert )
        break;
    }

