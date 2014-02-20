/* Don't use as-is - shell doesn't have enough precision to do quite the right thing */
var ns="dbname.collectionName";
 /* number of chunks you want each original chunk to split into */
var numChunks=8;  
var chunk2=db.getSiblingDB("config").chunks.find({ns:ns}).sort({ns:1,min:1}).toArray()[1];
var step=(chunk2.max._id-chunk2.min._id)/numChunks; /* calculates the step i.e. increment for each chunk */
db.getSiblingDB("config").chunks.find({ns:ns}).forEach(function(chunk) { 
      for (i=0; i<numChunks-1; i++) {   
            mn=chunk.min._id==MinKey? NumberLong(-9223372036854775808) : chunk.min._id;
            splitPoint=mn+(step*(i+1)); 
            print("splitting at " + splitPoint);
            sh.splitAt( ns, {_id:NumberLong(splitPoint)} );
     }
});
var numChunks=8;
var numShards=3;

var ns="dbname.collectionName";
var chunks=db.getSiblingDB("config").chunks.find({ns:ns}).toArray()
var orderedChunks=[];
for (c=0; c<chunks.length/numShards; c++) { 
   orderChunks.push(chunks[c]); 
   orderChunks.push(chunks[c+chunks.length/numShards]); 
   orderChunks.push(chunks[c+2*chunks.length/numShards]);
}
var step=(chunks[1].max._id-chunks[1].min._id)/numChunks; 
for ( c=0; c<orderChunks.length; c++) {
    for (i=0; i<numChunks-1; i++) { 
         chunk=orderChunks[c]; 
         mn=chunk.min._id==MinKey? NumberLong(-9223372036854775808) : chunk.min._id;
         splitPoint=mn+(step*(i+1));
         print("splitting at " + splitPoint);
         sh.splitAt(ns,{_id:NumberLong(splitPoint)} );
    }
}
