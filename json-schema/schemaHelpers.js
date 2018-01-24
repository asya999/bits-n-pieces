ifObject=function(x,y,z) { return {"$cond":[{$eq:[{$type:x},"object"]},y,z]}};
ifArray=function(x,y,z) { return {"$cond":[{$eq:[{$type:x},"array"]},y,z]}};
isNull=function(x) { return {$eq:[{$ifNull:[x, null]},null]}; };
percent=function(x, y) { return  {$trunc:{$multiply:[100,{$divide:[x, y]}]}}};
/* given array of {k:,v:} (returned from $objectToArray) return key/value/type */
getktvs=function(input) {
      var m={"$map":{}}; 
      m["$map"]["input"]=input; 
      m["$map"]["as"]="f"; 
      m["$map"]["in"]={k:"$$f.k",t:{$type:"$$f.v"}, v:"$$f.v"}; 
      return m;
};
/* given type, value, figure out type and return appropriate thing *
mapTV = function(t, v, i) {
    if (i>3) return {type:t, value:v}; 
    i=i+1; 
    return {"type":t, "value":{"$switch": 
       { "branches":[ 
          {"case":{$eq:[t,"objectId"]} , "then": "objectId" },
          {"case":{$eq:[t,"string"]} , "then": {$strLenCP:v} },
          {"case":{$eq:[t,"null"]} , "then": "null"},
          {"case":{$eq:[t,"object"]} , "then": { properties: mapObject(v,i) } },
          {"case":{$eq:[t,"array"]} , "then": { items: mapArray(v, i)} },
        ], 
        "default":"$$o.value"
      }
    }}
} */

/* type, value, recursion depth */
mapTV = function(t, v, i) {  /* no value */
    if (i>3) return {type:t, value:v}; 
    i=i+1; 
    return {"type":t, "value":{"$switch": 
       { "branches":[ 
          {"case":{$eq:[t,"object"]} , "then": { properties: mapObject(v,i) } },
          {"case":{$eq:[t,"array"]} , "then": { items: mapArray(v, i)} },
        ], 
        "default":"$$REMOVE"
      }
    }}
};

concatPrefix=function(key) {
    return {$concat:[
      ".",
       key
    ]};
};

concatPre=function(prefix, key) {
    return {$concat:[
      prefix,
      {$cond:[{$eq:[prefix,""]},"","."]},
       key
    ]};
};

/* given key/type/value, change value, based on type, only works on Object or Array */
mapValue = function(o,i,prefix) {
 if (i>3) return o; 
 i=i+1; 
 return {"$map":{"input":o, "as":"o", "in": {"k":"$$o.k", "t":"$$o.t", "v":{"$switch": 
  { "branches":[ 
    {"case":{$eq:["$$o.t","object"]} , "then": { properties: mapObject("$$o.v",i, {$concat:[prefix,"$$o.k",'.']}) } },
    {"case":{$eq:["$$o.t","array"]} , "then": { items: mapArray("$$o.v", i)} },
    ], 
    "default":"$$REMOVE"
  }
 }}}}
} 

mapObject = function (o, i, prefix) {
    if (i>3) return o; 
    i=i+1; 
    return mapValue(getktvs({$objectToArray:o}),i, prefix);
};

mapArray = function(a, i) {
     return {$map:{
	input: a, 
	in: ifObject("$$this",
                     mapValue(getktvs({$objectToArray:"$$this"}),i), /* should this be mapObject("$$this")? */
                     mapTV({$type:"$$this"},"$$this", i)
        )
     }};
};

concatIfArray = function(input) {
   return {$cond:[
	{$ne:["array",{$type:input}]},
	input,
	{"$reduce": { 
	    input: input,
            initialValue: [],
 	    in: {$concatArrays:["$$value","$$this"]}
        } }
   ]}
};

/* from input array of objects, concat given field */
merge = function(input, field) {
   return {$reduce: { input: {$map:{input:input, as: "m", in: "$$m."+field}},
           initialValue: [],
 	   in: {$concatArrays:["$$value","$$this"]}
   } }
};
getkeys=function(o) { /* get keys from object */
    return {$map:{input:{$objectToArray:o},in:"$$this.k"}}
};
getakeys=function(a) { /* get keys from array of objects */
    return {$concatArrays:[{$map:{input:a,in:getkeys("$$this")}}]};
};

arraygroup = function(input) {
   return {$reduce:{
	input:input,
	initialValue: [],
	in: {$cond:[
		{$in:["$$this.k","$$value.k"]},    
                /* this key is in list */
		{$concatArrays:[ {$filter:{input:"$$value.k"}} ] },
                /* this key is not in the list */
		{$concatArrays:["$$value", [ {k:"$$this.k", t: ["$$this.t"] } ]] }
	]}
   }}
};

/* unwind on passed in field keeping null and empty */
unwindKeep=function(p) {
    return {$unwind:{path:p,preserveNullAndEmptyArrays:true}};
};
groupPK=function(p,o) {
 return {$group:{_id:{i:"$_id","pk":p+".k"},i:{$first:o},count:{$sum:"$count"},pt:{$addToSet:p+".t"}}}; 
};
typea=function(t) { return {$cond: [{$eq:[{$size:t},1]},{$arrayElemAt:[t,0]},t]};};
toObj=function(p) {
  return {$arrayToObject:{$map:{input:p, in:{k:"$$this.k", v:{type:"$$this.t"}}}}};
};
/* light weight, without analyzing values */
prefix="";
db.cat.aggregate([
{$project:{p:mapValue(getktvs({$objectToArray:"$$ROOT"}),0,"")}},
unwindKeep("$p"),
{$group:{_id:{k:"$p.k",t:"$p.t"},count:{$sum:1},p:{$addToSet:"$p.v"},i:{$addToSet:"$p.v"}}},
{$addFields:{
     p:{$cond:[{$ne:["object","$_id.t"]},"$$REMOVE", merge("$p","properties") ]},
     i:{$cond:[{$ne:["array","$_id.type"]},"$$REMOVE", merge("$i","items") ]}
}},
/* handle properties */
unwindKeep("$p"), groupPK("$p"), 
{$group:{_id:"$_id.i", count:{$first:"$count"}, i:{$addToSet:"$i"}, p:{$push:{k:"$_id.pk","t":typea("$pt")}}}},
{$addFields:{
     p:{$cond:[{$ne:["object","$_id.t"]},"$$REMOVE", "$p" ]},
     i:{$cond:[{$ne:["array","$_id.t"]},"$$REMOVE", concatPrefix("$i")]}
}},
/* handle items */
{$group:{
	_id:"$_id.k", 
	types: {$push:{t:"$_id.t",c:"$count"}}, 
	total:{$sum:"$count"}, 
	items:{$addToSet:{$cond:[{$eq:["$_id.t","array"]},"$i",null]}},
	properties:{$addToSet:{$cond:[{$eq:["$_id.t","object"]},"$p",null]}}
}},
{$project:{_id:0, 
	k:"$_id",
	"v.description":{$concat:["The ","$_id"," field"]},
	"v.type" : {$cond:[{$eq:[{$size:"$types"},1]},{$arrayElemAt:["$types.t",0]},"$types.t"]},
	"v.items": {$cond:[{$in:["array","$types.t"]},concatPrefix("$items"), "$$REMOVE"]},
	"v.properties":{$cond:[{$in:["object","$types.t"]},concatPrefix("$properties"), "$$REMOVE"]},
        count:"$total"
}},
{$group:{_id:0, p:{$push:{k:"$k",v:"$v"}},required:{$push:{$cond:[{$eq:["$count",3]},"$k","$$REMOVE"]}}}},
{$project:{p:{$map:{input:"$p", in:{ }}}}},
{$project:{_id:0, _$schema:"json-schema/blah-blah",title:"sample1",type:"object",properties:{$arrayToObject:"$p"}}}
])

/* in: {type:{$type:"$$a"}} mapValue(getktvs({$objectToArray:"$$a"}),i),"$$a")}} *
	"v.minLength":{$cond:[{in:["string","$types.t"]},{$min:"$vals"},"$$REMOVE"]},
	vals:{$addToSet:"$v"}
*/
mapVal = function(o) { return {"$let":{"vars":{"o":o}, "in": {"k":"$$o.k", "t":"$$o.t", "v":{"$switch": 
{ "branches":[ 
    {"case":{$eq:["$$o.t","string"]} , "then": {$strLenCP:"$$o.v"} },
    {"case":{$eq:["$$o.t","objectId"]} , "then": "objectId" },
    {"case":{$eq:["$$o.t","array"]} , "then": {$size:"$$o.v"} }
], "default":"$$o.v"}} }}} 
};

tot=db.sample1.count();
/* build appropriate accumulator */
db.foo.aggregate([
{$project:{p:getktvs({$objectToArray:"$$ROOT"})}},
{$unwind:"$p"},
{$group: { _id: { k: "$p.k", t: "$p.t"}, count: { $sum: 1.0 } } }, 
{ $group: {
	_id: "$_id.k", 
	count: { $sum: "$count" }, 
	t: { $push: { t: "$_id.t", c: "$count" } } 
}}, 
{$addFields:{numTypes:{$size:"$t"}}},
{$project:{_id:0, count:1, 
     p:{"k":"$_id", 
        "v":{"description":{$concat:["The ","$_id"," field"]},
             "type":{$cond:[{$eq:["$numTypes",1]},{$arrayElemAt:["$t.t",0]},"$t.t"]}}}
}},
{$group:{_id:0, p:{$push:"$p"},count:{$sum:"$count"},required:{$push:{$cond:[{$eq:["$count",3]},"$_id","$$REMOVE"]}}}},
{$project:{_id:0, _$schema:"json-schema/blah-blah",title:"sample1",type:"object",properties:{$arrayToObject:"$p"}}}
]).pretty()

db.foo.aggregate([
{$project:{p:getktvs({$objectToArray:"$$ROOT"})}}, 
{$unwind:"$p"}, 
{$group: { _id: { k: "$p.k", type: "$p.t"}, count: { $sum: 1.0 } } }, 
{ $group: {
         _id: "$_id.k",
         count: { $sum: "$count" },
         t: { $push: { t: "$_id.t", c: "$count" } } 
}}, 
{$addFields:{numTypes:{$size:"$t"}}}, 
{$project:{ _id:0, count:1,
      k:"$_id",
      "v.description":{$concat:["The ","$_id"," field"]},
      "v.type":{$cond:[{$eq:["$numTypes",1]},{$arrayElemAt:["$t.t",0]},"$t.t"]} 
}}, 
{$group:{_id:0, p:{$push:{k:"$k",v:"$v"}},count:{$sum:"$count"},r:{$push:{$cond:[{$eq:["$count",3]},"$k",null]}}}}, 
{$project:{_id:0, 
  _$schema:"json-schema/blah-blah",
  title:"sample1",
  type:"object",
  properties:{$arrayToObject:"$p"},
  required:{$filter:{input:"$r",cond:{$ne:["$$this",null]}}}
}}
])

/* if "array" : $reduce all values into a single array, $map that array into types */

db.sample1.aggregate(
[ 
   {$project:{p:getktvs({$objectToArray:"$$ROOT"})}},
/* {$group:{_id:0, p:{$push:"$p"}}}, */
   {$project:{p:{$reduce:{input:"$p",initialValue:[], in:{$concatArrays:["$$value","$$this"]}}}}}, 
   {$addFields:{keys:{$setUnion:["$p.k"]}}}, 
   {$project:{p:{$map:{input:"$keys",as:"k", in:{k:"$$k",t:{$map:{input:{$filter:{input:"$p",cond:{$eq:["$$this.k","$$k"]}}},in:"$$this.t"}}}}}}} 
]
 ).pretty()


db.sample1.aggregate([
{ $project: {
	count: 1.0, 
	typeCounts: { $map: { input: { $setUnion: [ "$type.type" ] }, as: "utype", in: { k: { $ifNull: [ "$$utype", "null" ] }, v: { $sum: { $map: { input: { $filter: { input: "$type", cond: { $eq: [ "$$this.type", "$$utype" ] } } }, in: "$$this.c" } } } } } } 
} }, 
{ $addFields: { typeCounts: { $arrayToObject: "$typeCounts" } } } 
]);


mapDoc = function(o, i) { if (i>3) return o; i=i+1; return {"$map":{
                        "input":o, 
                        "as":"o", 
                        "in": {"k":"$$o.k", "t":"$$o.t", "v":{"$switch": 
{ "branches":[ 
    {"case":{$eq:["$$o.t","string"]} , "then": {$strLenCP:"$$o.v"} },
    {"case":{$eq:["$$o.t","objectId"]} , "then": "$$REMOVE" },
    {"case":{$eq:["$$o.t","array"]} , "then": mapArray("$$o.v", i) },
    {"case":{$eq:["$$o.t","string"]} , "then": {$strLenCP:"$$o.v"} },
  {"case":{$in:["$$o.t",["timestamp","bool","date"]]}, "then": "$$o.v" },
  {"case":{$eq:["$$o.t","object"]}, "then": {"$objectToArray":"$$o.v" } }
], "default":"$$o.v"}}
}}}
} 


mapObject = function(o, i) {
   if (i<=0) return {};
   i=i-1;
   return {$map:{
      input: {$objectToArray:o}, 
      in:{prefix:"$$this"}
   }}}

mapHold={$map: {
      input:"$o",
      as:"o",
      in:  {k:"$$o.k",
            v: { $cond:[ 
                  {$ne:[{$type:"$$o.v"},"object"]},
                   "$$o.v",
                   {$reduce:{
                      input: {$map:{
                               input:{$objectToArray:"$$o.v"},
                               in:"$$this.v"
                      }},
                      initialValue:"",
                      in: {$concat:["$$this","$$value"]}
                   }}
             ]}
      }
}};

concatReduceArrays = function() {
    return {$concatArrays:[ "$$value", ifArray("$$this", "$$this", [ "$$this" ]) ]}
};

/* this one works awesome for objects */
flattenObject = function(o, i=0, prefix="") {
    i=i+1; 
    if (i>4) return o;
    var v = "o"+i;
    return { "$reduce": {
      input : {$map: {
          input:{$objectToArray:o},
          as: "o"+i,
          in: {$cond: [
            {$ne:[{$type:"$$o"+i+".v"},"object"]},
            {k:concatPre(prefix,"$$o"+i+".k"),v:"$$o"+i+".v"},
            flattenObject("$$o"+i+".v", i, concatPre(prefix,"$$o"+i+".k"))
          ]}
      }},
      initialValue:[],
      in: concatReduceArrays()
    }};
};

fObjects = function(input) {
  return flattenObject(input, 0, "");
};

mapMapConcat = function(o, i, prefix) {
    i=i+1; 
    if (i>4) return o;
    return {$map: {
          input:{$objectToArray:o},
          as: "o",
          in: {$cond: [
            {$ne:[{$type:"$$o.v"},"object"]},
            {k:concatPre(prefix,"$$o.k"),v:"$$o.v"},
            {$reduce:{
                 input:mapMapConcat("$$o.v", i, concatPre(prefix,"$$o.k")),
                 initialValue: [ {k:"$$o.k", v:"$$o.v"} ],
                 in: {$concatArrays:[ "$$value", ifArray("$$this", "$$this", [ "$$this" ]) ]}
            }}
          ]}
      }};
};

f2Objects = function(input) {
  return {$reduce:{
    input: mapMapConcat(input, 0, ""),
    initialValue: [ ] ,
    in: {$concatArrays:[ "$$value", ifArray("$$this", "$$this", [ "$$this" ]) ]} 
  }};
};

f3Objects = function(input) {
 return {$reduce:{input: {$map: {
      input:{$objectToArray:input},
      as:"o",
      in:{$cond:[
        {$ne:[{$type:"$$o.v"},"object"]},
        {k:"$$o.k",v:"$$o.v"},
        {$reduce:{
           input: {$map:{
              input:{$objectToArray:"$$o.v"},
              in:{k:{$concat:["$$o.k",".","$$this.k"]},v:"$$this.v"}
           }},
           initialValue:[{k:"$$o.k",v:"$$o.v"}],
           in: {$concatArrays:["$$value",["$$this"]]}
        }}
      ]}
   }},
   initialValue:[ ],
   in: {$concatArrays:[ "$$value", ifArray("$$this", "$$this", [ "$$this" ]) ]}
 }};
};

db.sample1.aggregate([
{$project:{ fields:{$concatArrays:[
    {$filter:{input:"$o",cond:{$ne:[{$type:"$$this"},"array"]}}},
    {$reduce:{input:{$filter:{input:"$o",cond:{$eq:[{$type:"$$this"},"array"]}}},initialValue:[],in:{$concatArrays:["$$this","$$value"]}}}
]} }},
{$unwind:"$fields"},
{$group:{_id:"$fields.k",types:{$addToSet:{$type:"$fields.v"}},count:{$sum:1}}},
{$sort:{_id:1}}
]);



/* after the stage that produces o: [ {k:x, v:y} ] pairs unwind and group */

