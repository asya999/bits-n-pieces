
# Benchrunner template

## benchRun run document options
    ops   		array of "op" documents
    host		string
    db			string
    username		string
    password		string
    parallel		int			number of threads to run
    seconds		number			duration of test (in seconds)
    hideResults		bool
    handleErrors	bool
    hideErrors		bool
    throwGLE		bool
    breakOnTrap		bool
    trapPattern		regex,regexFlags
    noTrapPattern	regex,regexFlags
    watchPattern	regex,regexFlags
    noWatchPattern	regex,regexFlags

## Operations (op documents)

// list of ops to submit, unknown key names are ignored (for now)
// fields: 
     "ns"  : namespace, typically "db.collection" or t.getFullName()
     "delay" : number of milliseconds to sleep (after each op)
     "context"
     "check"              special option, check function
     "showError"
     "handleError"
  
     Array of operations to execute
     "op"  : operation, one of column one below with additional ones
        "findOne"
           "query"
           "showResult"
        "command", 
           "command", document to pass to runCommand
           "options"
           "showResult"
        "find"  |
        "query", 
           "options"
           "limit"
           "skip"
           "batchSize"
           "filter"
           "expected"
           "showResult"
        "update", 
           "multi"
           "upsert"
           "query"
           "update"
           "safe"
             "showResult"
             "throwGLE"
        "insert", 
           "safe"
             "showResult"
             "throwGLE"
           "doc"
        "delete" |
        "remove", 
           "multi"
           "query"
           "safe"
             "showResult"
             "throwGLE"
        "createIndex", 
           "key"
        "dropIndex", 
           "key"
  
  
  
  
  
//  # special pattern RAND_INT
// benchRun( { ops : [] , host : XXX , db : XXXX , parallel : 5 , seconds : 5 }
// possible no-op values: totals: bool, 
//
//
//

// result json object returned
// print with printjson( res );
	"note" : "values per second",
*	"errCount" : NumberLong(0),
	"trapped" : "error: not implemented",
*	"findOneLatencyAverageMs" : 3176.09113320733,
*	"updateLatencyAverageMs" : 16.849683414192913,
*	"insert" : 0,
*	"query" : 2433.8,
*	"update" : 2432.2,
*	"delete" : 0,
*	"getmore" : 0,
*	"command" : 48.2


Per benchrunner: hideResults (default true)
Per operation:   showResult (default false)

if (!hideResults || showResult) shows results
    false    false or true 
benchrunner hideResults = false overrides all per op showResult
    true            true  
operation showResult true overrides global hideResults any (true)
