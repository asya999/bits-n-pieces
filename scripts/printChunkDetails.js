printChunkDetails = function (d) {
   var chunksize = db.getSiblingDB(d).getCollection('settings').findOne({_id:"chunksize"}).value;
   var numchunks = db.getSiblingDB(d).getCollection('chunks').count();
   var dbhashTime = db.getSiblingDB(d).runCommand({dbhash:1, collections: ["collections", "chunks"]}).timeMillis; 
   var stats = db.getSiblingDB(d).getCollection('chunks').stats(1024*1024); 
   var indexSize = stats.totalIndexSize;
   var collSize = Math.round(numchunks*chunksize/1024);

   print ("chunksize: " + chunksize + "\tNumber of chunks: " + numchunks + "   \tTime to dbhash in millis: " + dbhashTime + "\tSize stats(MBs): " + stats.size + "\tindexes: " + indexSize + "\tAppox coll size(Gbs): " + collSize );
}
