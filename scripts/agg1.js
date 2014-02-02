var p1 = { "$project" : {
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
p2 = {
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
g1={
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
var minP1= {
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
