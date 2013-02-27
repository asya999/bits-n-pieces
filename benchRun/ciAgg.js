var start=new Date(); 
var res = db.b1.aggregate( [{$project: {holdings:1, year:1,month:1,day:1, formula1: {$add:[ "$randMult","$returns" ]}, formula2:{$divide:[ "$returns","$randMult" ]}  } }, {$group:{_id: {h:"$holdings",y:"$year",m:"$month",d:"$day"} , avg:{$avg:"$formula1"}  , sum: {$sum: "$formula2 " } }  } ] ) ; 
var end = new Date(); 
var execTime = (end-start)/1000; 
print(db.b1.count() + " documents in collection"); 
print("Number of unique keys aggregated over: " + res.result.length + " in " + execTime + " seconds");

