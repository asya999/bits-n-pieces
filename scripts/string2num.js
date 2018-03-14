string_to_number = function(stringin) { 
   return {$reduce: {
     input: {$range:[0,{$strLenCP:stringin}]},
     initialValue: 0,
     in: { $let: {
        vars: { 
               char:{$substr:[
                  stringin, 
                  {$subtract:[{$subtract:[{$strLenCP:stringin},1]}, "$$this"]},
                  1
               ]},
               factor: {$pow: [10, "$$this"]} 
            },
        in: {$add: ["$$value", {$multiply:["$$factor",{
          $switch: {
            branches: [
              {case: {$eq: ["$$char", "0"]}, then: 0},          
              {case: {$eq: ["$$char", "1"]}, then: 1},          
              {case: {$eq: ["$$char", "2"]}, then: 2},          
              {case: {$eq: ["$$char", "3"]}, then: 3},          
              {case: {$eq: ["$$char", "4"]}, then: 4},          
              {case: {$eq: ["$$char", "5"]}, then: 5},          
              {case: {$eq: ["$$char", "6"]}, then: 6},          
              {case: {$eq: ["$$char", "7"]}, then: 7},          
              {case: {$eq: ["$$char", "8"]}, then: 8},          
              {case: {$eq: ["$$char", "9"]}, then: 9} 
            ],     
            default: "error"
          }}]}]}
    }}
   }}; 
}


arrayOfDigits = [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9" ];

/* without a switch statement */
string2number = function(stringin) {
   return {$reduce: {
     input: {$range:[0,{$strLenCP:stringin}]},
     initialValue: 0,
     in: { $let: {
        vars: { 
               char:{$substr:[
                  stringin, 
                  {$subtract:[{$subtract:[{$strLenCP:stringin},1]}, "$$this"]},
                  1
               ]},
               factor: {$pow: [10, "$$this"]} 
            },
        in: {$add: ["$$value", {$multiply:[
              "$$factor",
              {$indexOfArray:[arrayOfDigits, "$$char"]} 
        ]}]}
    }}
  }}; 
}

