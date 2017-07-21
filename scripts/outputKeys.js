/*
 * given an expression representing an array of K/V pairs,
 * return an expression which outputs all of its keys
 * going to `i` levels deep
 * pre tracks the prefix as we "recurse" down
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
        "in": {$cond:[
            {$eq:["object",{$type:"$$this.v"}]}, 
            {$let:{
                vars: vars,
                in: outputKeys( {$objectToArray:"$$prev"+i+".v"}, i, {$concat:[pre,sep,"$$prev"+i+".k"]} )
            }},
            {$concat:[pre, sep, "$$this.k"]}
        ]} 
    }};
}
