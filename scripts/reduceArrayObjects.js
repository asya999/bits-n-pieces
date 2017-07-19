arrayize = function(input) {
    return {$cond:[{$eq:[{$type:input},"array"]}, input, [ input ] ]};
}
/*
 * given array of k/v objects, 
 * create an array with unique k fields
 *
 *
 */
reduceArrayKVObjects = function(input, unique = true) {
    var howtomergevalues = {$setUnion:[arrayize({$arrayElemAt:["$$match.v",0]}),arrayize("$$th.v")]};
    if (!unique) howtomergevalues = {$concatArrays:[arrayize({$arrayElemAt:["$$match.v",0]}),arrayize("$$th.v")]};
    return {$reduce:{
        input:{$slice:["$a",1,{$size:"$a"}]},
        initialValue:{$slice:["$a",0,1]},
        in:{$let:{ 
            vars: {
                th:"$$this",
                res:"$$value"
            },
            in: {$let:{
                vars:{match: {$filter:{input:"$$res",cond:{$eq:["$$this.k","$$th.k"]}}}},
                in: {$concatArrays:[ 
                   {$filter:{input:"$$res",cond:{$ne:["$$this.k","$$th.k"]}}},
                   {$cond:[
                       {$eq:[{$size:"$$match"},0]},
                       [ "$$th" ],
                       [ {k:"$$this.k", v: howtomergevalues } ],
                   ]}
                ]}
            }}
        }}
    }};
}
