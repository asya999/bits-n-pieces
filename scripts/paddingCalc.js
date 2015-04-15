collsWithPad=[];
var systemCollections=0; var userCollections=0; var padding1=0; var paddingGt1=0; totalPadding=0;   totalExtraSpace=0;
db.getMongo().getDBs().databases.forEach(function(dname) {
     dbname=dname.name;
     prevAppDbName="xxxFakeNotRealStartingName";
     db.getSiblingDB(dbname).getCollectionNames().forEach(function(dbcoll) {
             if ( dbcoll.startsWith("system") ) {
                return;
             }
             colon=dbcoll.indexOf(":");
             appdbname=dbcoll.slice(0,colon);
             if (colon==-1) {  appdbname=dbcoll; }
             name=dbcoll.slice(colon+1,9999);
             if ( appdbname != prevAppDbName ) {
                   if ( prevAppDbName != "xxxFakeNotRealStartingName" ) {
                        if (totalPadding==0) paddingGt1=1;
                        padinfo=padding1 + " no pad ";
                        if (  (userCollections-padding1)>0 ) {
                           padinfo +=  "& " + (userCollections-padding1) + " >1 pad.  " + Math.round((totalPadding/paddingGt1)*10000)/10000 + " avg pad for " + totalExtraSpace + " extra space.";
                        }
                        print(dbname+"."+appdbname + ": \t " + systemCollections + " sys, " + userCollections + " user, of them " + padinfo);
                   }
                   systemCollections=0; userCollections=0; padding1=0; paddingGt1=0; totalPadding=0;   
             }
             prevAppDbName=appdbname;
             if (name.slice(0,1)=="_") {
                 systemCollections+=1;
             } else {
                 userCollections+=1;
                 stats=db.getSiblingDB(dbname).getCollection(dbcoll).stats();
                 pad=Math.round(stats.paddingFactor*10000)/10000;
                 if (pad==1) {
                      padding1+=1;
                 } else {
                      collsWithPad.push(dbname+"."+dbcoll);
                      paddingGt1+=1;
                      totalPadding+=pad;
                 }
             }
     });
     if (totalPadding==0) paddingGt1=1;
     padinfo=padding1 + " no pad ";
     if (  (userCollections-padding1)>0 ) {
           padinfo +=  "& " + (userCollections-padding1) + " >1 pad.  " + Math.round((totalPadding/paddingGt1)*10000)/10000 + " avg pad";
     }
     print(dbname+"."+appdbname + ": \t " + systemCollections + " sys, " + userCollections + " user, of them " + padinfo);
});

function po2(n) {  y=Math.floor(Math.log(n)/Math.log(2));  return Math.pow(2,y+1); }
countThresh=99999;
skipSmall=0;
outcount=0;
db.getSiblingDB("local").sizes2.drop();
db.getMongo().getDBs().databases.forEach(function(dname) {
  dbname=dname.name;
  db.getSiblingDB(dbname).getCollectionNames().forEach(function(dbcoll) {
    if ( dbcoll.startsWith("system") ) {
       return;
    }
    collname=dbcoll;
    dc=dbname+"."+collname;
    stats=db.getSiblingDB(dbname).getCollection(collname).stats();
  try {
    if (stats.count==0) {
      skipSmall++;
      return;
    }
    outcount++;
    maxCount=stats.count;
    bigC="";
    if (stats.count>countThresh) { maxCount=countThresh; bigC="*"; } /* less than 100K */
    sz=0;  
    p2sz=0;
    db.getSiblingDB(dbname).getCollection(collname).find().limit(countThresh).forEach(function(doc) { 
      s=Object.bsonsize(doc); 
      sz+=s;
      p2sz+=po2(s);
    });
    avgRealSize=Math.round(sz/maxCount);
    avgPo2Size=Math.round(p2sz/maxCount);
    namePad="";
    if (collname.length<62) namePad=Array(62-collname.length).join(' ');
    if (outcount%50==1)
        print("        dbname+collname      \t\t\t\t\tpad\tcount\tavgSz\trealAvgSz\tsize\tdocSize\tResyncSize\tpadWasted"); 
    db.getSiblingDB("local").sizes2.insert({db:dbname,coll:collname,count:stats.count,statAvg:stats.avgObjSize, realAvg: avgRealSize, realSize: sz, resyncSize: (Math.round(stats.count*avgRealSize*stats.paddingFactor*10000))/10000, avgPo2size: avgPo2Size, totalPo2size: p2sz} );
    print(collname.slice(0,62)+namePad + " " + stats.count+bigC + "\t " + stats.avgObjSize + " \t     " + avgRealSize + 
            "\t" + stats.size + "\t" + sz + "\t" + (Math.round(stats.count*avgRealSize*stats.paddingFactor*10000))/10000 + "    \t" + (stats.size-sz));
  } catch(err) {
    print(dc + " had error " + err);
  }
});
});
print("\nSkipped " + skipSmall + " collections with fewer than 10 documents.");


{$project:{ padding: {$cond:{if:{$eq:["$stats.paddingFactor",1]},then:"1",else:makeBucket("$stats.paddingFactor",[1,1.01,1.03,1.05,1.1,1.2,1.4,1.6,1.8,2])}},
            actualSize:"$val.bytesWithHeaders",freeRec:1, totalFree:1, 
            count:"$stats.count",size:"$stats.size",storage:"$stats.storageSize"}},
{$group:{_id:"$padding", 
            docs:{$sum:"$count"}, 
            actSize:{$sum:"$actualSize"}, 
            totalSize:{$sum:"$size"}, 
            totalStorage:{$sum:"$storage"},
            totalFree:{$sum:"$totalFree"},
            count:{$sum:1}
}},
{$sort:{_id:1}},
{$project:{_id:0, paddingRange:"$_id", num:"$count",ratio:round({$divide:["$totalSize","$totalStorage"]},3), onFreeListGBs:round(toGBs("$totalFree"),2), actSizeGBs:round(toGBs("$actSize"),2),statSize:round(toGBs("$totalSize"),2),extraStorageGBs:round(toGBs({$subtract:["$totalStorage","$actSize"]}),2)}}

		"currSize" : {
			"$sum" : {
				"$multiply" : [
					"$count",
					"$statAvg"
				]
			}
		},
		"nopadSize" : {
			"$sum" : {
				"$multiply" : [
					"$count",
					"$realAvg"
				]
			}
		},
		"resyncSize" : {
			"$sum" : {
				"$multiply" : [
					"$count",
					"$resyncAvg"
				]
			}
		},
		"po2size" : {
			"$sum" : {
				"$multiply" : [
					"$count",
					"$avgPo2size"
				]
			}
		}


outcount=0;
skipError=[];
db.getMongo().getDBs().databases.forEach(function(dname) {
   dbname=dname.name;
   db.getSiblingDB(dbname).getCollectionNames().forEach(function(dbcoll) {
     if ( dbcoll.startsWith("system") ) {
           return;
     }
     collname=dbcoll;
     dc=dbname+"."+collname;
     stats=db.getSiblingDB(dbname).getCollection(collname).stats();
     delete(stats.indexSizes);
     outcount++;
     namePad="";
     if (collname.length<62) namePad=Array(62-collname.length).join(' ');
     if (outcount%100==1)    print(""+outcount+"    dbname+collname      \t\t\t\t\tpad\tcount\tavgSz\trealAvgSz\tsize\tdocSize\tResyncSize\tpadWasted");
     val=db.getSiblingDB(dbname).getCollection(collname).validate(true);
     delete(val.keysPerIndex);
     try {
        db.getSiblingDB("local").sizes4.insert({_id:dc, db:dbname,coll:collname, stats:stats, val:val} );
        print(collname.slice(0,62)+namePad + " " + stats.paddingFactor + "\t" + stats.count + "\t " + stats.avgObjSize + " \t     " +  stats.size);
     } catch(err) {
        print(collname + " had error " + err);   
        skipError.push(dc);
     } 
   });
});

db.getMongo().getDBs().databases.forEach(function(dname) {
   dbname=dname.name;
   /* skip local db */
   if ( dbname.startsWith("local") ) return;
   db.getSiblingDB(dbname).getCollectionNames().forEach(function(dbcoll) {
     /* skip system collection */
     if ( dbcoll.startsWith("system") ) return;
     collname=dbcoll;
     dc=dbname+"."+collname;
     if (db.getSiblingDB("local").getCollection("sizes4").count({_id:dc}) > 0) return;
     skipError.push(dc);
     stats=db.getSiblingDB(dbname).getCollection(collname).stats();
     delete(stats.indexSizes);
     val=db.getSiblingDB(dbname).getCollection(collname).validate(true);
     delete(val.keysPerIndex);
     try {
        db.getSiblingDB("local").sizes4.insert({_id:dc, db:dbname,coll:collname, stats:stats, val:val} );
        print(collname + " " + stats.paddingFactor + "\t" + stats.count);
     } catch(err) {
        print(collname + " had error " + err);   
        skipError.push(dc);
     } 
}); });
     
