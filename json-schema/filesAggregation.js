db.files.aggregate(
    {$match:{parent:null}},
    {$graphLookup:{from:"files", startWith:"$_id",connectToField:"parent",connectFromField:"_id",as:"paths",depthField:"d"}}, 
    {$addFields:{ordered:{$map:{input:{$range:[{$size:"$paths"},0,-1]},as:"i",in:{ $arrayElemAt:[ {$filter:{input:"$paths",cond:{$eq:["$$this.d",{$subtract:["$$i",1]}]}}},0]}}}}},
    {$addFields:{dirId:{$arrayElemAt:["$ordered._id",0]}}},
    {$lookup:{from:"files",localField:"dirId",foreignField:"parent",as:"files"}}
).pretty()
