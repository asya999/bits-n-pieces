db.testcoll.aggregate(
    {$addFields:{ 
      s:{$size:"$data"},
      expected:{$reduce:{input:{$map:{input:"$data",in:{$size:"$$this"}}},initialValue:1,in:{$multiply:["$$value","$$this"]}}}, 
      arraySizes:{$map:{input:"$data",in:{$size:"$$this"}}}
    }},
    {$addFields:{r:{$map:{input:{$range:[0,{$size:{$arrayElemAt:["$data",0]}}]},as:'a',
                         in:{$map:{input:{$range:[0, {$size:{$arrayElemAt:["$data",1]}} ]},as:'b',
                            in:{$map:{input:{$range:[0,{$size:{$arrayElemAt:["$data",2]}}]},as:'c',
                               in:{a:'$$a',b:'$$b',c:'$$c'}}}}}}}}}
).pretty()

db.testcoll.aggregate(
 {$addFields:{
    sizeOfData:{$size:"$data"}, 
    expectedSizeOfCP:{$reduce:{input:{$map:{input:"$data",in:{$size:"$$this"}}},initialValue:1,in:{$multiply:["$$value","$$this"]}}}, 
    cp: {$reduce: {
      initialValue: { $arrayElemAt: ["$data", 0]    },
      input: {$slice:["$data",1,{$size:"$data"}]},
      in: {$let: { 
           vars: { currentr: "$$this", currenta: "$$value" },
           in: {
             $reduce: {
                input: 
                {$map: { input: "$$currenta", as: "a",
                   in: { $map: { input: "$$currentr", as: "r",
                        in: { $mergeObjects: ["$$a", "$$r"] }
                   } } 
                } },
                initialValue: [ ],
                in: {$concatArrays:["$$value", "$$this"]} 
            } } 
       } }
    } } 
} }
,{$addFields:{actual:{$size:"$cp"}}}
,{$redact:{$cond:{if:{$ne:["$actual","$expectedSizeOfCP"]},then:"$$KEEP",else:"$$PRUNE"}}}
).pretty()

db.testcoll.aggregate(
 {$addFields:{
    sizeOfData:{$size:"$data"}, 
    expectedSizeOfCP:{$reduce:{input:{$map:{input:"$data",in:{$size:"$$this"}}},initialValue:1,in:{$multiply:["$$value","$$this"]}}}, 
    cp: {$reduce: {
      initialValue: [ { } ],
      input: "$data",
      in: {$let: { 
           vars: { currentr: "$$this", currenta: "$$value" },
           in: {
             $reduce: {
                input: 
                {$map: { input: "$$currenta", as: "a",
                   in: { $map: { input: "$$currentr", as: "r",
                        in: { $mergeObjects: ["$$a", "$$r"] }
                   } } 
                } },
                initialValue: [ ],
                in: {$concatArrays:["$$value", "$$this"]} 
            } } 
       } }
    } } 
} }
,{$addFields:{actual:{$size:"$cp"}}}
,{$redact:{$cond:{if:{$ne:["$actual","$expectedSizeOfCP"]},then:"$$KEEP",else:"$$PRUNE"}}}
).pretty()

/* } }}    
} }) */

db.testcoll.aggregate({$project: {
    data:1,
    sizeOfData:{$size:"$data"}, 
    arraySizes:{$map:{input:"$data",in:{$size:"$$this"}}},
    cp: { $reduce: { 
      input: "$data", 
      initialValue: { $arrayElemAt: ["$data", 0] },
      in: { $let: { 
        vars: { currentr: "$$this", currenta: "$$value" },
        in: { $cond: [{ $eq: ["$$currentr", "$$currenta"] }, "$$currenta",
               { $reduce: { input: {
                $map: { input: "$$currenta", as: "a",
                in: { $map: { input: "$$currentr",
            as: "r", in: { $mergeObjects: ["$$a", "$$r"] } } } } },
                initialValue: [],
                         in: { $concatArrays: ["$$value", "$$this"] } }
   }] } } } } }, 
    expectedSizeOfCP:{$reduce:{input:{$map:{input:"$data",in:{$size:"$$this"}}},initialValue:1,in:{$multiply:["$$value","$$this"]}}}
  } }
 ,{$addFields:{actual:{$size:"$cp"}}}
 ,{$redact:{$cond:{if:{$ne:["$actual","$expectedSizeOfCP"]},then:"$$KEEP",else:"$$PRUNE"}}}
).pretty()

db.testcoll.aggregate({
   $project: {
    data:1,
    sizeOfData:{$size:"$data"}, 
    arraySizes:{$map:{input:"$data",in:{$size:"$$this"}}},
    cp: { $reduce: { 
      input: "$data",
      initialValue: { $arrayElemAt: ["$data", 0] },
      in: { $let: { vars: { currentr: "$$this", currenta: "$$value" },
                    in:{ $reduce: { 
                       input: { $map: {
                              input: "$$currenta", as: "a",
                              in: { $map: { 
                                    input: "$$currentr", as: "r",
                                    in: { $mergeObjects: ["$$a", "$$r"] }
                              } }
                       } },
                       initialValue: [],
                       in: { $setUnion: ["$$value", "$$this"] }
               } } 
      } } 
    } },
    expectedSizeOfCP:{$reduce:{input:{$map:{input:"$data",in:{$size:"$$this"}}},initialValue:1,in:{$multiply:["$$value","$$this"]}}}
  } }
 ,{$addFields:{actual:{$size:"$cp"}}}
 ,{$redact:{$cond:{if:{$ne:["$actual","$expectedSizeOfCP"]},then:"$$KEEP",else:"$$PRUNE"}}}
 ).pretty()
