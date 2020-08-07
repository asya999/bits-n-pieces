compareFields = function (o1, o2, f1="k", f2="t") {
  return {$and:[ {$eq:[ o1+'.'+f1, o2+'.'+f1 ]}, {$eq:[ o1+'.'+f2, o2+'.'+f2 ]} ]};
}

mergeObjects = function ( o1, o2) {
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

addValueToObject = function (o, f, val) {
   var ad={$add:[ {$ifNull:[o+'.'+f,0]}, {$ifNull:[val,0]} ]};
   var newo = { };
   newo[f]=ad;
   return {$mergeObjects: [  o, newo ]};
}

ifObject = function(x,y,z) { return {"$cond":[{$eq:[{$type:x},"object"]},y,z]}};
ifArray=function(x,y,z) { return {"$cond":[{$eq:[{$type:x},"array"]},y,z]}};
isNull=function(x) { return {$eq:[{$ifNull:[x, null]},null]}; };

getktvs = function(input) {
      var m={"$map":{}};
      m["$map"]["input"]=input;
      m["$map"]["as"]="f";
      m["$map"]["in"]={k:"$$f.k",t:{$type:"$$f.v"}, v:"$$f.v"};
      return m;
};
/* given type, value, figure out type and return appropriate thing */
mapTV = function(t, v, i) {
    if (i>3) return {t:t, v:v};
    i=i+1;
    return {"t":t, "v":{"$switch":
       { "branches":[
          {"case":{$eq:[t,"objectId"]} , "then": "objectId" },
          {"case":{$eq:[t,"string"]} , "then": {$strLenCP:v} },
          {"case":{$eq:[t,"null"]} , "then": "null"},
          {"case":{$eq:[t,"object"]} , "then": { properties: mapObject(v,i) } },
          {"case":{$eq:[t,"array"]} , "then": { items: mapArray(v, i)} },
        ],
        "default":"$$o.v"
      }
    }}
}
/* given k/t/v, change value, based on type */
mapValue = function(o,i) {
 if (i>3) return o;
 i=i+1;
 return {"$map":{"input":o, "as":"o", "in": {"k":"$$o.k", "t":"$$o.t", "v":{"$switch":
  { "branches":[
    {"case":{$eq:["$$o.t","objectId"]} , "then": "objectId" },
    {"case":{$eq:["$$o.t","string"]} , "then": {$strLenCP:"$$o.v"} },
    {"case":{$eq:["$$o.t","null"]} , "then": "null"},
    {"case":{$eq:["$$o.t","object"]} , "then": { properties: mapObject("$$o.v",i) } },
    {"case":{$eq:["$$o.t","array"]} , "then": { items: mapArray("$$o.v", i)} },
    ],
    "default":"$$o.v"
  }
 }}}}
}
mapObject = function (o, i) {
    if (i>3) return o;
    i=i+1;
    return mapValue(getktvs({$objectToArray:o}),i);
}
mapArray = function(a, i) {
      return {$map:{
        input: a,
        as: "a",
        in: ifObject("$$a",mapValue(getktvs({$objectToArray:"$$a"}),i),mapTV({$type:"$$a"},"$$a", i))}}
}

/* from input array of objects, concat given field */
merge = function(input, field) {
     return {$reduce: { input: {$map:{input:input, as: "m", in: "$$m."+field}},
                  initialValue: [],
                       in: {$concatArrays:["$$value","$$this"]}
                     } }
};

getKeysAsArray = function(obj) {
   return {$map:{input:{$objectToArray:obj},as:"o",in:"$$o.k"}}
}

mergeObjects34 = function(o1, o2) {
   return {$arrayToObject:{$concatArrays:[ {$objectToArray:o1}, {$objectToArray:o2} ]}};
}

load("/Users/asya/github/bits-n-pieces/scripts/sortArray.js")

/* merge objects differentiating on "k" expects an array of objects of {k:x, v:y} */
smartMergeObjects = function(oos) {
  /* var ok1 = {$objectToArray:o1};
  var ok2 = {$objectToArray:o2};
  var both = {$concatArrays: [ ok1, ok2 ]};
  var sz = {$size:both};
  var input = {$range:[0,sz]}; */
  var oWithCount = {$map:{input:oos,in:{$mergeObjects:[{count:1},"$$this"]}}};
  var redArray =  {$reduce:{
         initialValue: [ ],
         input: oWithCount,
         in: {$let:{ 
           vars: { t:"$$this",  v:"$$value" }, 
           in:{$let:{ /* thisElem is the matching key element in $$value to $$this */
                  vars:{thisElem:{$arrayElemAt:[{$filter:{input:"$$v", cond:{$eq:["$$t.k","$$this.k"]}}},0]}},
                  in: {$cond:[
                         {$in:["$$t.k","$$v.k"]},
                         {$concatArrays:[
                            /* all elements except the one we have now */
                            {$filter:{input:"$$v", cond:{$ne:["$$t.k","$$this.k"]}}},
                            [ {k: "$$t.k", 
                              t: {$cond:[{$in:["$$t.t",{$ifNull:[ifArray("$$thisElem.t","$thisElem.t",["$$thisElem.t"]),[]]}]},
                                "$$t.t",
                                {$concatArrays:[ 
                                      ifArray("$$t.t","$$t.t",[ "$$t.t" ]), 
                                      ifArray("$$thisElem.t","$$thisElem.t",[ "$$thisElem.t" ]), 
                              ]} ]},
                              v: {$concatArrays:[ 
                                      ifArray("$$t.v","$$t.v",[ "$$t.v" ]), 
                                      ifArray("$$thisElem.v","$$thisElem.v",[ "$$thisElem.v" ]), 
                              ]},
                              count: {$add:[{$ifNull:["$$t.count",1]},{$ifNull:["$$thisElem.count",1]}]}
                            } ]
                         ]},
                         {$concatArrays:["$$v", [ "$$t" ] ]}
                  ]}
              }}
          }}
  }};
  return redArray;
}
/* given array of objects, merge them by "k", appending "t" and "v" fields and adding counts */
/* expected object shape: { k:"x", t:"y", v:any, count:1+ */
groupObjects = function(input) {
}

concatReduceArrays = function() {
      return {$concatArrays:[ "$$value", ifArray("$$this", "$$this", [ "$$this" ]) ]}
};

concatIfArray = function(input) {
     return {$cond:[
        {$eq:["array",{$type:input}]},
            {"$reduce": {
                   input: input,
                   initialValue: [],
                   in: {$concatArrays:["$$value",ifArray("$$this","$$this",["$$this"])]}
               } },
             input
           ]}
};

flattenField = function(input) {
     return {$map:{input:input,as:"o",
         in:{k:"$$o.k", t:"$$o.t",v:{$cond:[
              {$eq:["object","$$o.t"]},"$$o.v",
              {$cond:[{$eq:["array","$$o.t"]},{items:concatIfArray("$$o.v.items")}, "$$o.v"
         ]} ]}}
     }};
}

db.testcoll.aggregate([ 
    {$project:{__o:mapValue(getktvs({$objectToArray:"$$ROOT"}),0)}}, 
    {$addFields:{
         __o:flattenField("$__o")
    }}
]).pretty()


foo = db.testcoll.count()
db.testcoll.aggregate([ 
    {$project:{p:mapValue(getktvs({$objectToArray:"$$ROOT"}),0)}}, 
    {$unwind:"$p"}, 
    {$group:{_id:{k:"$p.k",t:"$p.t"},count:{$sum:1},v:{$addToSet:"$p.v"}}}, 
    {$group:{         _id:"$_id.k",         types: {$push:{t:"$_id.t",c:"$count"}},         total:{$sum:"$count"},         items:{$push:{$cond:[{$eq:["$_id.t","array"]},"$v",null]}},         properties:{$push:{$cond:[{$eq:["$_id.t","object"]},"$v",null]}} }}, 
    {$project:{_id:0,         k:"$_id",         "v.description":{$concat:["The ","$_id"," field"]},         "v.t" : {$cond:[{$eq:[{$size:"$types"},1]},{$arrayElemAt:["$types.t",0]},"$types.t"]},         "v.items": {$cond:[{$in:["array","$types.t"]},"$items.items", "$REMOVE"]},         "v.properties":{$cond:[{$in:["object","$types.t"]},"$properties.properties", "$REMOVE"]},         count:"$total" }}, 
    {$group:{_id:0, p:{$push:{k:"$k",v:"$v"}},required:{$push:{$cond:[{$eq:["$count", foo ]},"$k","$REMOVE"]}}}}, 
    {$project:{_id:0, _$schema:"json-schema/blah-blah",title:"sample1",type:"object",properties:{$arrayToObject:"$p"}}} 
])
