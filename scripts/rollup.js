rollup = function ( dims, quant ) {
    var groupStage = {$group: { _id: {}, total:{$sum:quant}}}; 
    var facetStage = {$facet: { } }; 
    var dimsString = dims[0];
    for (i=1; i<dims.length; i++) dimsString = dimsString+"_"+dims[i];
    dims.forEach(function(d) {
       groupStage["$group"]["_id"][d] = "$" + d;
    });
    facetStage["$facet"]["by"+dimsString] = [{$sort:{_id:1}}];
    for (var i=1; i<dims.length; i++) {
        if (dimsString.lastIndexOf("_") == -1) break;
        dimsString = dimsString.slice(0,dimsString.lastIndexOf("_"));
        var groupId = {};
        for (f in groupStage["$group"]["_id"]) {
            groupId[f] = "$_id." + f;
        }
        for (j=dims.length-i; j<dims.length; j++) delete(groupId[dims[j]]);
        facetStage["$facet"]["by"+dimsString] = [{$group:{_id:groupId,total:{$sum:"$total"}}}];
    };
    facetStage["$facet"]["GrandTotal"] = [{$group:{_id:{grandTotal:null}, total:{$sum:"$total"}}}];
    var concatStage = {$project:{results:{$concatArrays:[]}}};
    for (f in facetStage["$facet"]) {
        concatStage["$project"]["results"]["$concatArrays"].push("$"+f);
    }
    var unwindStage = {$unwind:"$results"};
    var reformatStage = {$replaceRoot:{newRoot:{$mergeObjects:["$results._id", {total:"$results.total"}]}}};
    return [ groupStage, facetStage, concatStage, unwindStage, reformatStage];
}
