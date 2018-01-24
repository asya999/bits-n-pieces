unagg = function(cursorOrResultDoc) {
   if (cursorOrResultDoc.hasOwnProperty("result")) return cursorOrResultDoc.result;
   else return cursorOrResultDoc.toArray();
};

makeBuckets = function (field, array) {
     if (!array.hasOwnProperty("length")) throw "second argument must be an array";
     if (array.length<2) throw "Expecting an array with more than one value.";
     var con=[];
     var maxPos=array.length;
     con[maxPos]="" + array[maxPos-1] + "+";
     for (pos = maxPos-1; pos > 0; pos--) {
        con[pos] = {"$cond":{
                  if: {$lt:[field, array[pos]]},
                  then:  "" + array[pos-1]+"-"+array[pos],
                  else:  con[pos+1]
        }};
     }
     var first = "<" + array[0];
     con[0]={"$cond":{if: {$lt:[field,array[0]]}, then: first, else: con[1] }};
     return con[0];
}

isNum = function (field) {
     var minv = NumberLong("-9223372036854775807");
     var maxv = NumberLong("9223372036854775807");
     return { "$cond" : { "if" : { $and: [ {$gte: [ field, minv ] }, {$lte: [ field, maxv]   }   ]  },
                          then: true,
                          else: false
            } };
}

getTypes = function (field) {
     var alltypes=[
                { t: "Regex", minv: Timestamp(2147483647,9999) },
                { t: "Timestamp", minv: Timestamp(0,0) },
                { t: "ISODate", minv: new Date(0,0,0) },
                { t: "True", minv: true },
                { t: "False", minv: false },
                { t: "ObjectId", minv: ObjectId("000000000000000000000000") },
                { t: "BinData", minv: BinData(0,"") },
                { t: "Array", minv: [] },
                { t: "Subdocument", minv: {} },
                { t: "String", minv: "" },
                { t: "Number", minv: NumberLong("-9223372036854775807") },
                { t: "Null", minv: null }
     ] ;

     var maxPos=alltypes.length;

     var con=[];
     con[maxPos]="Other/Unknown";
     for (pos = maxPos-1; pos > -1; pos--) {
        con[pos] = {"$cond":{
              if: {$gte:[field, alltypes[pos]["minv"] ]},
              then:  alltypes[pos]["t"],
              else:  con[pos+1]
        }};
     }
     return con[0];
}

toGBs=function(field) {
  return {$divide:[field,1024*1024*1024]}
}

toMBs=function(field) {
  return {$divide:[field,1024*1024]}
}

max=function(a,b) { return {$cond:{if:{$gt:[a,b]},then:a,else:b}} }

min=function(a,b) { return {$cond:{if:{$gt:[a,b]},then:b,else:a}} }

percent=function(f1, total) {
    return round({$multiply:[{$divide:[ f1,total ]},100]} , 2);
}

diff=function(f1,f2) {
   sub1={"$subtract":[f1,f2]}; /* f1-f2 < 0 ? f1-f2 : f2-f1 */
   sub2={"$subtract":[f2,f1]}; /* f1-f2 < 0 ? f1-f2 : f2-f1 */
   calc={"$cond":[{"$gt":[sub1,0]}, sub1, sub2]};
   return calc;
};

truncate = function (val,places) {
     var p={ };
     var divider=Math.pow(10,places);
     p["$divide"]=[];
     var newval={"$multiply":[val,divider]};
     sub={"$subtract":[ newval, {"$mod":[newval, 1]} ]};
     p["$divide"].push(sub);
     p["$divide"].push(divider);
     return p;
}

round = function (val,places) {
     var p={ };
     var divider=Math.pow(10,places);
     p["$divide"]=[];
     var newval={$add:[{"$multiply":[val,divider]},.5]}
     sub={"$subtract":[ newval, {"$mod":[newval, 1]} ]};
     p["$divide"].push(sub);
     p["$divide"].push(divider);
     return p;
}

within=function(f1,f2,dt) {
   cond={"$cond":[]};
   orCond={"$or":[]};
   and1={"$and":[]};
   and2={"$and":[]};
   l1={"$lt":[f1,dt]};
   l2={"$lt":[f2,dt]};
   g1={"$gt":[f1,dt]};
   g2={"$gt":[f2,dt]};
   and1.push(l1);
   and1.push(g2);
   and2.push(l2);
   and2.push(g1);
   orCond.push(and1);
   orCond.push(and2);
   cond["$cond"].push(orCond);
   cond["$cond"].push(true);
   cond["$cond"].push(false);
   return cond;
};

