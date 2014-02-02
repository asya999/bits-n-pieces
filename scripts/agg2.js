db.changelog.aggregate({$group:{_id:{ns:"$ns",day:{$dayOfMonth:"$time"}},successes:{$sum:{$cond:[{$eq:["$what","moveChunk.commit"]},1,0 ]} }, failures:{$sum:{$cond:[{$eq:["$details.note","aborted"]},1,0 ]}    }}},{$sort:{"_id":1}}, {$match:{failures:{$gt:0}}}, {$project:{ns:"$_id.ns", day:"$_id.day", success:"$successes", failure:"$failures", ratio:{$divide:["$successes", {$add:["$successes","$failures"]} ]},_id:0} })
{ "ns" : "hours.hours", "day" : 1, "success" : 1743, "failure" : 2936, "ratio" : 0.37251549476383844 }
{ "ns" : "hours.hours", "day" : 2, "success" : 11, "failure" : 14, "ratio" : 0.44 }
{ "ns" : "hours.hours", "day" : 3, "success" : 11, "failure" : 13, "ratio" : 0.4583333333333333 }
{ "ns" : "hours.hours", "day" : 4, "success" : 2, "failure" : 4, "ratio" : 0.3333333333333333 }
{ "ns" : "hours.hours", "day" : 5, "success" : 2, "failure" : 5, "ratio" : 0.2857142857142857 }
{ "ns" : "hours.hours", "day" : 6, "success" : 7, "failure" : 30, "ratio" : 0.1891891891891892 }
{ "ns" : "hours.hours", "day" : 7, "success" : 3, "failure" : 15, "ratio" : 0.16666666666666666 }
{ "ns" : "hours.hours", "day" : 8, "success" : 0, "failure" : 6, "ratio" : 0 }
{ "ns" : "hours.hours", "day" : 9, "success" : 6, "failure" : 37, "ratio" : 0.13953488372093023 }
{ "ns" : "hours.hours", "day" : 10, "success" : 3, "failure" : 4, "ratio" : 0.42857142857142855 }
{ "ns" : "minutes.minutes", "day" : 1, "success" : 1844, "failure" : 4034, "ratio" : 0.3137121469887717 }
{ "ns" : "minutes.minutes", "day" : 2, "success" : 39, "failure" : 72, "ratio" : 0.35135135135135137 }
{ "ns" : "minutes.minutes", "day" : 3, "success" : 11, "failure" : 36, "ratio" : 0.23404255319148937 }
{ "ns" : "minutes.minutes", "day" : 4, "success" : 5, "failure" : 12, "ratio" : 0.29411764705882354 }
{ "ns" : "minutes.minutes", "day" : 5, "success" : 2, "failure" : 6, "ratio" : 0.25 }
{ "ns" : "minutes.minutes", "day" : 6, "success" : 10, "failure" : 28, "ratio" : 0.2631578947368421 }
{ "ns" : "minutes.minutes", "day" : 7, "success" : 6, "failure" : 11, "ratio" : 0.35294117647058826 }
{ "ns" : "minutes.minutes", "day" : 8, "success" : 3, "failure" : 4, "ratio" : 0.42857142857142855 }
{ "ns" : "minutes.minutes", "day" : 9, "success" : 10, "failure" : 81, "ratio" : 0.10989010989010989 }
{ "ns" : "minutes.minutes", "day" : 10, "success" : 2, "failure" : 4, "ratio" : 0.3333333333333333 }
Fetched 20 record(s) in 3ms
cs9525config@local(2.5.3) > db.chunks.find({"min.i":NumberLong(-9072513853326149535)})
Fetched 0 record(s) in 37ms
cs9525config@local(2.5.3) > db.chunks.find({"min.i":NumberLong-9072513853326149535})
Fetched 0 record(s) in 63ms
cs9525config@local(2.5.3) > db.chunks.find({"min.i":-9072513853326149535})
{ "_id" : "hours.hours-i_-9072513853326149535", "lastmod" : Timestamp(615, 0), "lastmodEpoch" : ObjectId("5193aa8d451dc238dfa1eccd"), "ns" : "hours.hours", "min" : { "i" : NumberLong("-9072513853326149535") }, "max" : { "i" : NumberLong("-9072501449337856134") }, "shard" : "mtx2-4" }
{ "_id" : "minutes.minutes-i_-9072513853326149535", "jumbo" : true, "lastmod" : Timestamp(65, 3), "lastmodEpoch" : ObjectId("5197793f451dc238dfa1ecce"), "max" : { "i" : NumberLong("-9072501449337856134") }, "min" : { "i" : NumberLong("-9072513853326149535") }, "ns" : "minutes.minutes", "shard" : "mtx2-1" }
Fetched 2 record(s) in 38ms

p111= {
	"$project" : {
		"ns" : 1,
		"who" : "$server",
		"when" : "$time",
		"donor" : "$details.from",
		"recip" : "$details.to",
		"what" : {
			"$substr" : [
				"$what",
				0,
				9
			]
		},
		"aborted" : {
			"$cond" : [
				{
					"$eq" : [
						"$details.note",
						"aborted"
					]
				},
				1,
				0
			]
		},
		"note" : {
			"$substr" : [
				"$what",
				10,
				6
			]
		},
		"step1" : {
			"$ifNull" : [
				"$details.step1 of 6",
				"$details.step1 of 5"
			]
		},
		"step2" : {
			"$ifNull" : [
				"$details.step2 of 6",
				"$details.step2 of 5"
			]
		},
		"step3" : {
			"$ifNull" : [
				"$details.step3 of 6",
				"$details.step3 of 5"
			]
		},
		"step4" : {
			"$ifNull" : [
				"$details.step4 of 6",
				"$details.step4 of 5"
			]
		},
		"step5" : {
			"$ifNull" : [
				"$details.step5 of 6",
				"$details.step5 of 5"
			]
		},
		"step6" : {
			"$ifNull" : [
				"$details.step6 of 6",
				"$details.step6 of 5"
			]
		},
		"_id" : 0,
		"chunk" : {
			"mn" : {
				"$ifNull" : [
					"$details.min.i",
					"$details.before.min.i"
				]
			},
			"mx" : {
				"$ifNull" : [
					"$details.max.i",
					"$details.before.max.i"
				]
			}
		}
	}
}
p12 = {
	"$project" : {
		"what" : 1,
		"ns" : 1,
		"who" : 1,
		"donor" : 1,
		"recip" : 1,
		"note" : 1,
		"chunk" : 1,
		"aborted" : 1,
		"steps" : {
			"$ifNull" : [
				{
					"$add" : [
						"$step1",
						"$step2",
						"$step3",
						"$step4",
						"$step5",
						"$step6"
					]
				},
				1
			]
		}
	}
}
var g11= {
	"$group" : {
		"_id" : {
			"ns" : "$ns",
			"chunk" : "$chunk"
		},
		"migrateAttempts" : {
			"$sum" : {
				"$cond" : [
					{
						"$eq" : [
							"$note",
							"start"
						]
					},
					1,
					0
				]
			}
		},
		"commits" : {
			"$sum" : {
				"$cond" : [
					{
						"$eq" : [
							"$note",
							"commit"
						]
					},
					1,
					0
				]
			}
		},
		"splits" : {
			"$sum" : {
				"$cond" : [
					{
						"$eq" : [
							"$what",
							"split"
						]
					},
					1,
					0
				]
			}
		},
		"failures" : {
			"$sum" : "$aborted"
		},
		"stepsum" : {
			"$sum" : "$steps"
		},
		"count" : {
			"$sum" : 1
		}
	}
}
minP1= {
	"$project" : {
		"ns" : 1,
		"who" : "$server",
		"when" : "$time",
		"donor" : "$details.from",
		"recip" : "$details.to",
		"what" : {
			"$substr" : [
				"$what",
				0,
				9
			]
		},
		"aborted" : {
			"$cond" : [
				{
					"$eq" : [
						"$details.note",
						"aborted"
					]
				},
				1,
				0
			]
		},
		"note" : {
			"$substr" : [
				"$what",
				10,
				6
			]
		},
		"step1" : {
			"$ifNull" : [
				"$details.step1 of 6",
				"$details.step1 of 5"
			]
		},
		"step2" : {
			"$ifNull" : [
				"$details.step2 of 6",
				"$details.step2 of 5"
			]
		},
		"step3" : {
			"$ifNull" : [
				"$details.step3 of 6",
				"$details.step3 of 5"
			]
		},
		"step4" : {
			"$ifNull" : [
				"$details.step4 of 6",
				"$details.step4 of 5"
			]
		},
		"step5" : {
			"$ifNull" : [
				"$details.step5 of 6",
				"$details.step5 of 5"
			]
		},
		"step6" : {
			"$ifNull" : [
				"$details.step6 of 6",
				"$details.step6 of 5"
			]
		},
		"_id" : 0,
		"chunk" : {
			"$ifNull" : [
				"$details.min.i",
				"$details.before.min.i"
			]
		}
	}
}
