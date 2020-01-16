
{
	"$lookup" : {
		"from" : "cumulative_target",
		"as" : "dummy",
		"let" : {
			"doc" : "$$ROOT",
                        "summing" : "$$ROOT.b"
		},
		"pipeline" : [
			{$facet:{count:[{$count:"c"}]}},
			{$unwind:{path:"$count",preserveNullAndEmptyArrays:true}},
                        {$lookup:{from : "cumulative_target","let":{cc:"$count.c"}, "as" :"t", pipeline:[ {$limit:1},{$addFields:{count:"$$cc"}} ] }},
			{$unwind:"$t"},
                        {$project:{ target:{$cond:[ {$gt:["$count.c",0]}, "$t.target", {sum:0, count:0}]}}},
                        {$project:{ "target.sum":{$add : [ "$target.sum", "$$summing"]}, "target.count" : { "$add" : [ "$target.count", 1 ] }}},
			{$replaceRoot : {newRoot : { $mergeObjects : [ "$$doc", "$$ROOT" ] } } },
			{$out: "cumulative_target" }
		]
	}
}

var initialize = {
	"$lookup" : {
		"from" : "dummy",
		"as" : "dummy",
		"pipeline" : [
                        {$collStats:{}},
                        {$project:{ "target.sum":{$literal:0}, "target.count" : {$literal:0}}},
			{$out: "cumulative_target" }
		]
	}
}

var accum = {
	"$lookup" : {
		"from" : "cumulative_target",
		"as" : "dummy",
		"let" : {
			"doc" : "$$ROOT",
                        "summing" : "$$ROOT.b"
		},
		"pipeline" : [
                        {$project:{ "target.sum":{$add : [ "$target.sum", "$$summing"]}, "target.count" : { "$add" : [ "$target.count", 1 ] }}},
			{$out: "cumulative_target" }
		]
	}
}

var addFields = {
	"$lookup" : {
		"from" : "cumulative_target",
		"as" : "runningTotal",
                "let" : { id:"$_id"},
                "pipeline" : [
                   {$match:{$expr:{$ne:["$_id", "$$id"]}}}
                ]
        }
}

var reshape = {
	$addFields: {
		dummy: "$$REMOVE",
		runningTotal: "$$REMOVE",
		runningCount:{$arrayElemAt:["$runningTotal.target.count",0]},
		runningSum:{$arrayElemAt:["$runningTotal.target.sum",0]}
	}
}
