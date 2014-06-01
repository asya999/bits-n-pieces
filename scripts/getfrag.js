getFrag=function (scale) {
     var units="";
     rounding=2;
     if (scale == undefined) scale=1;
     if (scale==1) units=" bytes";
     if (scale==1024) units=" KBs";
     if (scale==1024*1024) units=" MBs";
     if (scale==1024*1024*1024) units=" GBs";
     if (scale < 2000) rounding=0;
     print("Scale is " + scale + " = " + units + " with rounding " + rounding);
     var dbStats = db.stats();
     var totalsData=0;
     var totalsStorage=0;
     var totalsIndex=0;
     db.getCollectionNames().forEach(
         function(z) {
             if (z.lastIndexOf("system.",0)===0) return;
             var stats=db.getCollection(z).stats();
             var valid=db.getCollection(z).validate();
             var deleted = valid.deletedCount;
             var extents = valid.extentCount;
             print("ns: " + stats.ns 
                    + " \tsize: " + (stats.size/scale).toFixed(rounding)
                    + " \ttotalIndexSize: " + (stats.totalIndexSize/scale).toFixed(rounding)
                    + " \tstorageSize: " + (stats.storageSize/scale).toFixed(rounding) 
                    + " \tdeletedSize: " + (valid.deletedSize/scale).toFixed(rounding) 
                    + " \t numDeleted: " + deleted
                    + " \t numExtents: " + extents
                    + " \t padding: " + stats.paddingFactor.toFixed(rounding));             
             print( "\t\t\t  --> deleted+size to storage ratio: " 
                     + ((valid.deletedSize+stats.size)/stats.storageSize).toFixed(3) 
             );
             print( "\t\t\t  --> data to storage fragmentation ratio: "
                     + (stats.size/stats.storageSize).toFixed(3)
             );
             totalsStorage+= stats.storageSize;
             totalsIndex+= stats.totalIndexSize;
             totalsData+= stats.size;
          } 
     ); 
     print("\nDB Fragmentation stats:  " 
                + "\n\t file size: " + (dbStats.fileSize/scale).toFixed(1)
                + "\n\t storage size: " + (dbStats.storageSize/scale).toFixed(1)
                + "\n\t index size: " + (dbStats.indexSize/scale).toFixed(1)
                + "\n\t data size: " + (dbStats.dataSize/scale).toFixed(1)
                + "\n\t Overall fragmentation : \n\t\t\t" 
                        + (totalsData/totalsStorage).toFixed(3) + " or " + ((totalsStorage-totalsData)/scale).toFixed(rounding)  + units  + " data storage (real) fragmentation on " + (totalsStorage/scale).toFixed(rounding) + units + "of data\n\t\t\t"
                        + ((totalsStorage+totalsIndex)/dbStats.fileSize).toFixed(3) + " or " + ((dbStats.fileSize-totalsStorage-totalsIndex)/scale).toFixed(rounding) + units + " over-allocation on " + (dbStats.fileSize/scale).toFixed(rounding) + units + " of files"
                + ".");
}
