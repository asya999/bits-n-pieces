    // skipped dropping the table and reinitializing as I'm assuming you have your test dataset
    // your database is called test and collection is foo in this code
    ops = [
    // this sets up an array of operations benchRun will run
       { 
          // possible operations include find, findOne, update, insert, delete, etc.
          op : "find" ,   
          // your db.collection
          ns : "test.foo" ,  
          // different operations have different query options - this matches based on _id
          // getting a random value between 0 and 100 each time
          query : { _id : { "#RAND_INT" : [ 0 , 100 ] } 
        }
       }
    ]
    
    for ( x = 1; x<=128; x*=2){
        // actual call to benchRun, each time using different number of threads
        res = benchRun( { parallel : x ,   // number of threads to run in parallel
                          seconds : 5 ,    // duration of run can be fractional seconds
                          ops : ops        // array of operations to run (see above)
                        } )
        // res is a json object, easiest way to see everything in it is:
        printjson( res )
        print( "threads: " + x + "\t queries/sec: " + res.query )
    }

