rankArray=function(inputArray, sortField="", dense=false) {
    let suffix = "";
    if (sortField!="") {
        suffix = "."+sortField;
    };
    let orderVar = {};
    if (dense) {
        orderVar = {$cond:[ 
                    {$ne:["$$this"+suffix, "$$value.prevVal"]}, 
                    {$add:["$$value.order", 1]}, 
                    "$$value.order"
                ]};
    } else {
        orderVar =  {$add:["$$value.order",1]};
    }
    var red = {$reduce:{
        input:inputArray,
        initialValue: {a:[ ],order:0, prevRank:undefined,prevVal:undefined},
        in: {$let:{ 
            vars: { 
                order: orderVar,
                rank:  {$cond:[ 
                    {$ne:["$$this"+suffix, "$$value.prevVal"]}, 
                    {$add:["$$value.order", 1]}, 
                    "$$value.prevRank"
                ]}
            },
            in:{
                a:{$concatArrays:["$$value.a", [{$mergeObjects:["$$this", {rank:"$$rank"}]}]]},
                prevVal: "$$this"+suffix,
                order: "$$order",
                prevRank:"$$rank"
            }
        } }
    }};
    return {$let:{
        vars: { extract:red },
        in: "$$extract.a"
    }};
}

