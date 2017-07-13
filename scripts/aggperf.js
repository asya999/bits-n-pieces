
var coll="products";

/* basic aggregation */

function result(desc, ftime, atime) {
    if (ftime==0) ftime=0.5;
    if (atime==0) atime=0.5;
    if (ftime == atime || Math.abs(ftime-atime)<2 || ((ftime/atime)>.9 && (ftime/atime)<1.1)) { 
       loser="  TIE";
       p = 0;
       print("\t"+desc+":\n\t\t  find " + ftime + "ms   \t vs agg  " + atime + "ms.   \t        \t " + loser + "    ");
       return;
    } else if (ftime < atime) {
      loser=" agg";
      p = Math.round((atime/ftime)*100)-100;
    } else { 
      loser = " find";
      p = Math.round((ftime/atime)*100)-100;
   }

    print("\t"+desc+":\n\t\t  find " + ftime + "ms   \t vs agg  " + atime + "ms.   \t Loser  \t " + loser + " by " + p + "%");
}

function runCount(findOrAgg, coll, q) {
  var start=new Date(); 
  if (findOrAgg=='agg') db.getCollection(coll).aggregate({$match:q},{$count:"count"});
  else db.getCollection(coll).count(q);
  var end = new Date(); 
  return (end-start);
}

function runAgg(coll, agg) {
  var start=new Date(); 
  var res = db.getCollection(coll).aggregate( agg ).toArray();
  var end = new Date(); 
  return (end-start);
}

/* distinct command */
function runDistinct(findOrAgg, coll, f, query) {
  var start=new Date(); 
  if (findOrAgg=='agg') db.getCollection(coll).aggregate({$match:query},{$group:{_id:"$"+f}}).toArray();
  else res = db.getCollection(coll).distinct( f, query); 
  var end = new Date(); 
  return (end-start);
}

function runDistinctCounts(findOrAgg, coll, f, query) {
  var start=new Date(); 
  if (findOrAgg=='agg') db.getCollection(coll).aggregate({$match:query},{$group:{_id:"$"+f, count:{$sum:1}}}).toArray();
  else res = db.getCollection(coll).distinct( f, query).forEach(function( d ) { c={}; c[f]=d; db.getCollection(coll).count( c ); });
  var end = new Date(); 
  return (end-start);
}

distinctFilters = [ {}, {type:{$in:["Game","Movie","Music","HardGood"]}} ]

distinctFilters.forEach(function(q) {
     var fdur = runDistinct('find', coll, "type", q );
     var adur = runDistinct('agg', coll, "type", q );
     result("distinct", fdur, adur );
     fdur = runDistinctCounts( 'find', coll, "type", q );
     adur = runDistinctCounts( 'agg', coll, "type", q );
     result("distinct with counts", fdur, adur );
     
});

function getDocs(findOrAgg, coll, q, limit) {
  var start=new Date(); 
  if (findOrAgg=="find") var res=db.getCollection(coll).find(q).limit(limit).toArray();
  else var res=db.getCollection(coll).aggregate({$match:q},{$limit:limit}).toArray();
  var end = new Date(); 
  return (end-start);
}

function getDocsSkip(findOrAgg, coll, q, limit) {
  var sl= +limit - 1;
  var start=new Date(); 
  if (findOrAgg=="find") var res=db.getCollection(coll).find(q).skip(sl).limit(1).toArray();
  else var res=db.getCollection(coll).aggregate({$match:q},{$skip:sl},{$limit:1}).toArray();
  var end = new Date(); 
  return (end-start);
}

function getDocsProj(findOrAgg, coll, q, p, limit) {
  var start=new Date(); 
  if (findOrAgg=="find") var res=db.getCollection(coll).find(q, p).limit(limit).toArray();
  else var res=db.getCollection(coll).aggregate({$limit:limit}, {$project:p}, {$match:q}).toArray();
  var end = new Date(); 
  return (end-start);
}

function getDocsProjSkip(findOrAgg, coll, q, p, limit) {
  var sl= +limit - 1;
  var start=new Date(); 
  if (findOrAgg=="find") var res=db.getCollection(coll).find(q, p).limit(1).skip(sl).toArray();
  else var res=db.getCollection(coll).aggregate({$match:q},{$project:p}, {$skip: sl}, {$limit:1}).toArray();
  var end = new Date(); 
  return (end-start);
}

function getDocsProjSkipWithSort(findOrAgg, coll, q, p, limit, sort) {
  var sl= +limit - 1;
  var start=new Date(); 
  if (findOrAgg=="find") var res=db.getCollection(coll).find(q, p).sort(sort).limit(1).skip(sl).toArray();
  else var res=db.getCollection(coll).aggregate({$match:q},{$project:p}, {$sort:sort}, {$skip: sl}, {$limit:1} ).toArray();
  var end = new Date(); 
  return (end-start);
}

var doc=db.getCollection(coll).findOne({type:"HardGood"})
var fullProjection={};
for (f in doc) { fullProjection[f]=1; };

[{}, {type:"Music"}, {type:"Movie", mpaaRating:{$in:["PG","PG-13"]},theatricalReleaseDate:{$ne:null}}].forEach(function(q) {
      var adur=runCount("agg", coll, q);
      var fdur=runCount("find", coll, q);
      result("counts", fdur, adur );
});

[{type:"Music"}, {type:"HardGood"}].forEach(function(q) {
   print("filter " + tojsononeline(q));
   [ 100, 500, 1000, 2000 ].forEach(function(l) {
       print("  batch size: " + l);
       var fdur= getDocs( "find", coll, q, l);
       var adur= getDocs( "agg", coll, q, l);
       result("just docs", fdur, adur );
       var fdur = getDocsSkip( "find", coll, q, l);
       var adur = getDocsSkip( "agg", coll, q,  l);
       result("just docs with skip", fdur, adur );
       var fdur = getDocsProjSkip( "find", coll, q, {protectionPlanDetails:1}, l);
       var adur = getDocsProjSkip( "agg", coll, q,{protectionPlanDetails:1},  l);
       result("single projection" , fdur, adur );
       var fdur = getDocsProjSkip( "find", coll, q, fullProjection, l);
       var adur = getDocsProjSkip( "agg", coll, q, fullProjection, l);
       result("full projection", fdur, adur );
       var fdur = getDocsProjSkipWithSort( "find", coll, q, fullProjection, l, {type:1});
       var adur = getDocsProjSkipWithSort( "agg", coll, q,fullProjection, l, {type:1});
       result("sort by type", fdur, adur );
   });
});

[{type:"Movie"} ].forEach(function(q) {
   print("filter " + tojsononeline(q));
   [ 100, 500, 1000, 2000 ].forEach(function(l) {
       print("  batch size: " + l);
       var fdur= getDocs( "find", coll, q, l);
       var adur= getDocs( "agg", coll, q, l);
       result("just docs with skip", fdur, adur );
       var fdur = getDocsProjSkip( "find", coll, q, {_id:0, type:1, format:1, genre:1}, l);
       var adur = getDocsProjSkip( "agg", coll, q, {_id:0, type:1, format:1, genre:1}, l);
       result("with two projected fields" , fdur, adur );
       var fdur = getDocsProjSkip( "find", coll, q, {_id:0, type:1, mpaaRating:1, format:1, genre:1, theatricalReleaseDate:1}, l);
       var adur = getDocsProjSkip( "agg", coll, q, {_id:0, type:1, mpaaRating:1, format:1, genre:1, theatricalReleaseDate:1}, l);
       result("with five projected fields" , fdur, adur );
       var fdur = getDocsProjSkipWithSort( "find", coll, q, {_id:0, type:1, mpaaRating:1, format:1, genre:1, theatricalReleaseDate:1}, l, {mpaaRating:1});
       var adur = getDocsProjSkipWithSort( "agg", coll, q, {_id:0, type:1, mpaaRating:1, format:1, genre:1, theatricalReleaseDate:1}, l, {mpaaRating:1});
       result("sort by Rating (indexed)" , fdur, adur );
       var fdur = getDocsProjSkipWithSort( "find", coll, q, {_id:0, type:1, mpaaRating:1, format:1, genre:1, theatricalReleaseDate:1}, l, {percentSavings:1});
       var adur = getDocsProjSkipWithSort( "agg", coll, q, {_id:0, type:1, mpaaRating:1, format:1, genre:1, theatricalReleaseDate:1}, l, {percentSavings:1});
       result("sort by %savings (no index)" , fdur, adur );
   });
});
