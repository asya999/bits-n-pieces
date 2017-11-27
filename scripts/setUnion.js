compareFields = function (o1, o2, f1, f2) {
  return {$and:[ {$eq:[ o1+'.'+f1, o2+'.'+f1 ]}, {$eq:[ o1+'.'+f2, o2+'.'+f2 ]} ]};
}

mergeObj = function ( o1, o2) {
   /* in order to have the second object "win" we need to remove the fields of o2 from o1 */
   return {$arrayToObject:{$let:{
      vars:{o2:{$objectToArray:o2} },
      in:{$concatArrays:[ 
	{$filter:{
            input:{$objectToArray:o1}, 
            cond:{$not:{$in:["$$this.k", "$$o2.k"]} }
        }},
	"$$o2" 
     ]}}}}
}

addValue36 = function (o, f, val) {
   var ad={$add:[ {$ifNull:[o+'.'+f,0]}, {$ifNull:[val,0]} ]};
   var newo = { };
   newo[f]=ad;
   return {$mergeObjects: [  o, newo ]};
}

addValue34 = function (o, f, val) {
   var ad={$add:[ {$ifNull:[o+'.'+f,0]}, {$ifNull:[val,0]} ]};
   var newo = { };
   newo[f]=ad;
   return mergeObj(o, newo);
}

addValueAll = function (o, f, val, efields) {
   var lt= {$let: { vars: {obj:o}, in: { }}};  
   efields.forEach(function(ef) {
       lt["$let"]["in"][ef] = "$$obj."+ef;
   });
   lt["$let"]["in"][f] = {$add: [ {$ifNull:["$$obj"+'.'+f,0]}, {$ifNull:[val,0]} ]};
   return lt; 
}

p={$project:{
     result:{ $reduce:{
        input: {$concatArrays:["$l", "$m"]}, 
        initialValue: {$setUnion:[{$map:{input:{$setUnion:{$concatArrays:["$l","$m"]}}, in:{a:"$$this.a",b:"$$this.b"}}}]}, 
        in: {$let:{
           vars:{cur:"$$this"}, 
           in: {$map:{input:"$$value", in:{$cond:[compareFields("$$this", "$$cur", "a", "b"),  addValueAll("$$this", "c", "$$cur.c", ["a","b"]), "$$this"]}} }
        }}
     }}
}}

p34={$project:{
     result:{ $reduce:{
        input: {$concatArrays:["$l", "$m"]}, 
        initialValue: {$setUnion:[{$map:{input:{$setUnion:{$concatArrays:["$l","$m"]}}, in:{a:"$$this.a",b:"$$this.b"}}}]}, 
        in: {$let:{
           vars:{cur:"$$this"}, 
           in: {$map:{input:"$$value", in:{$cond:[compareFields("$$this", "$$cur", "a", "b"),  addValue34("$$this", "c", "$$cur.c"), "$$this"]}} }
        }}
     }}
}}

p36={$project:{
     result:{ $reduce:{
        input: {$concatArrays:["$l", "$m"]}, 
        initialValue: {$setUnion:[{$map:{input:{$setUnion:{$concatArrays:["$l","$m"]}}, in:{a:"$$this.a",b:"$$this.b"}}}]}, 
        in: {$let:{
           vars:{cur:"$$this"}, 
           in: {$map:{input:"$$value", in:{$cond:[compareFields("$$this", "$$cur", "a", "b"),  addValue36("$$this", "c", "$$cur.c"), "$$this"]}} }
        }}
     }}
}}
