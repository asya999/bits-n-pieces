db.arraysort.aggregate({$addFields:{sortedA:{$slice:[
  {$reduce:{
      input:"$a", 
      initialValue: [ MaxKey, MinKey ], 
      in: {$let:{ 
        vars: { rv:"$$value", rt:"$$this"},   
        in: {$let:{
          vars:{ 
            idx:{ $reduce:{ 
              input:{$range:[0,{$size:"$$rv"}]}, 
              initialValue: 9999999, 
              in: {$cond:[ 
                {$gt:["$$rt", {$arrayElemAt:["$$rv","$$this"]}]}, 
                {$min:["$$value","$$this"]}, 
                "$$value" 
              ]}
            }}
          },
          in: {$concatArrays:[ 
            {$cond:[ 
              {$eq:[0, "$$idx"]}, 
              [ ],
              {$slice: ["$$rv", 0, "$$idx"]}
            ]},
            [ "$$rt" ], 
            {$slice: ["$$rv", "$$idx", {$size:"$$rv"}]} 
          ]} 
        }}
      }}
  }},
  1, {$size:"$a"} ]}
}}).pretty()
