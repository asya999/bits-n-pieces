unagg = function(cursorOrResultDoc) {
   if (cursorOrResultDoc.hasOwnProperty("result")) return cursorOrResultDoc.result;
   else return cursorOrResultDoc.toArray();
};

diff=function(f1,f2) {
   sub1={"$subtract":[f1,f2]}; /* f1-f2 < 0 ? f1-f2 : f2-f1 */
   sub2={"$subtract":[f2,f1]}; /* f1-f2 < 0 ? f1-f2 : f2-f1 */
   calc={"$cond":[{"$gt":[sub1,0]}, sub1, sub2]};
   return calc;
};

within=function(f1,f2,dt) {
   cond={"$cond":[]};
   calc=diff(f1,f2);
   le={"$le":[calc,dt]};
   cond["$cond"].push(calc);
   cond["$cond"].push(true);
   cond["$cond"].push(false);
   return cond;
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
