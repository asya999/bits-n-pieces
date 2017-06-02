sortArray = function( inputArray, sortField="", asc=false) {       
  /* expecting literal string "$a" for inputArray and 
   * if sorting on "$a.f" then "f" for sortField 
   * if a is array of scalars, then expecting "" or nothing as the sortField 
   */
  var suffix = "";
  var maxF=MaxKey;
  if (sortField!="") {
    suffix = "."+sortField;
    maxF={};
    if (sortField.indexOf('.')>-1) {
       var mx=maxF;
       var tokens = sortField.split('.');
       tokens.slice(0,tokens.length-1).forEach(function(m) {
           mx[m]={}; mx=mx[m];
       });
       mx[tokens[tokens.length-1]]=MaxKey;
    }
  }
  var initialArray=[ maxF ];
  var sliceReduce = {$slice:[
    {$reduce:{
      input:inputArray, 
      initialValue: initialArray,
      in: {$let:{ 
        vars: { rv:"$$value", rt:"$$this"},   
        in: {$let:{
          vars:{ 
            idx:{ $reduce:{ 
              input:{$range:[0,{$size:"$$rv"}]}, 
              initialValue: 9999999, 
              in: {$cond:[ 
                {$gt:["$$rt"+suffix, {$arrayElemAt:["$$rv"+suffix,"$$this"]}]}, 
                {$min:["$$value","$$this"]}, 
                "$$value" 
              ]}
            }}
          },
          in: {$concatArrays:[ 
            {$cond:[ 
              {$eq:[0, "$$idx"]}, 
              [ ],
              {$slice: ["$$rv", 0, "$$idx"]}
            ]},
            [ "$$rt" ], 
            {$slice: ["$$rv", "$$idx", {$size:"$$rv"}]} 
          ]} 
        }}
      }}
  }},
  1, {$size:inputArray} ]};
  if (asc) return {$reverseArray:sliceReduce};
  else return sliceReduce;
}
