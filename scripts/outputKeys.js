/*
 * given an expression representing an array of K/V pairs,
 * return an expression which outputs all of its keys
 * going to `i` levels deep
 * `prefix` tracks the prefix as we "recurse" down
 *
 */
outputKeys = function(inputArray, i, pre="") {
    i=i-1;
    if (i<0) return inputArray;
    var sep="";
    var vars = {};
    var v = "prev"+i;
    vars[v]="$$this";
    if (pre!="") sep=".";
    return { "$map": { 
        "input": inputArray, 
        "in": {$cond:{
            if: {$eq:["object",{$type:"$$this.v"}]}, 
            then: {$let:{
                vars: vars,
                in: outputKeys( {$objectToArray:"$$prev"+i+".v"}, i, {$concat:[pre,sep,"$$prev"+i+".k"]} )
            }},
            else: {$cond:{
                if: {$eq:["array", {$type:"$$this.v"}]},
                then: {$let:{
                    vars: vars,
                    in: {$map:{ 
                        input:{$filter:{
                            input:"$$prev"+i+".v", 
                            cond:{$eq:[{$type:"$$this"},"object"]}
                        }},
                        in: outputKeys({$objectToArray:"$$this"}, i, {$concat:[pre,sep,"$$prev"+i+".k"]} )
                    }}
                }},
                else: {$concat:[pre, sep, "$$this.k"]}
            }}
        }} 
    }};
}
