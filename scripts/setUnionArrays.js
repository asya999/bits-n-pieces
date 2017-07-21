/*
 * helper function to union elements of an array
 * into a single set - elements may be themselves
 * arrays in which case they will be "recursively"
 * unioned to i level
 */
setUnionArrays = function (inputArray, i=0) { 
    if (i<0) return inputArray;
    i--;
    return {$reduce:{
        input:inputArray, 
        initialValue:[], 
        in: {$setUnion:[
            "$$value", 
            {$cond:[
                {$isArray:"$$this"}, 
                setUnionArrays("$$this",i),
                ["$$this"]
            ]}
        ]}
    }};
}
