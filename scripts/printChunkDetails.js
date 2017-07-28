printChunkDetails = function (d) {
   var chunksize = db.getSiblingDB(d).getCollection('settings').findOne({_id:"chunksize"}).value;
   var numchunks = db.getSiblingDB(d).getCollection('chunks').count();
   var dbhashTime = db.getSiblingDB(d).runCommand({dbhash:1, collections: ["collections", "chunks"]}).timeMillis; 
   var stats = db.getSiblingDB(d).getCollection('chunks').stats(1024*1024); 
   var indexSize = stats.totalIndexSize;
   var collSize = Math.round(numchunks*chunksize/2/1024);

   print ("chunksize: " + chunksize + "\tNum chunks: " + numchunks + "   \tdbhash Time(millis): " + dbhashTime + "\t Size stats(MBs) data: " + stats.size + " \tindexes: " + indexSize + " \tAppox coll size(Gbs): " + collSize );
}
