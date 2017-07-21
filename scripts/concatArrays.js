/*
 * helper function to concat elements of an array
 * into a single array - elements may be themselves
 * arrays in which case they will be "recursively"
 * concat'ed to i level
 */
concatArrays = function (inputArray, i=0) { 
    if (i<0) return inputArray;
    i--;
    return {$reduce:{
        input:inputArray, 
        initialValue:[], 
        in: {$concatArrays:[
            "$$value", 
            {$cond:[
                {$isArray:"$$this"}, 
                concatArrays("$$this",i),
                ["$$this"]
            ]}
        ]}
    }};
}
