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
