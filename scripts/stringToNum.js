arrayOfDigits = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9" ];

db.convert2.aggregate(
 {$addFields:{string:{$cond:{if:{$eq:["-",{$substr:["$string",0,1]}]}, then:{neg:true, s:{$substr:["$string",1,{$strLenCP:"$string"}]}},else:{neg:false,s:"$string"}}}}}
 {$addFields:{num: {$reduce:{initialValue:0, input:{$map:{input:{$range:[{$strLenCP:"$string.s"},0,-1]},in:{$let:{vars:{index:{$subtract:["$$this",1]},factor:{$pow:[10,{$subtract:[{$strLenCP:"$string.s"},"$$this"]}]}},in:{$multiply:[ "$$factor", {$indexOfArray:[arrayOfDigits, {$substr:["$string.s","$$index",1]}]} ]}}}}},in:{$add:["$$value","$$this"]}}}}},
 {$project:{string:"$string.s", num:{$cond:["$string.neg",{$subtract:[0,"$num"]},"$num"]}}}
)
