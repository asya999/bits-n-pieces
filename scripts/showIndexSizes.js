showIndexSizes = function (dbname, verbose) {
        var collectionList=db.getSiblingDB(dbname).getCollectionNames();
        print("Indexes sizes for database " + dbname);
        collectionList.forEach(function(c) {
             var stats=db.getSiblingDB(dbname).getCollection(c).stats();
             var numdocs=stats.count;
             var collsize=stats.size;
             print("Collection " + c + " with " + numdocs + " documents, size  " + collsize);
             var indexSizes=stats.indexSizes;
             var indexes=db.getSiblingDB(dbname).getCollection(c).getIndexes();
             indexes.forEach(function(i) { 
                bsize = indexSizes[i.name];
                isize = "" + bsize + " (";
                if (bsize > 1024*1024*1024) isize+=(bsize/1024/1024/1024).toFixed(2)+ "GB)";
                else if (bsize > 1024*1024) isize+=(bsize/1024/1024).toFixed(2)+ "MB)";
                else if (bsize > 1024) isize+=(bsize/1024).toFixed(2)+ "KB)";
                ikey = "";
                proj={};
                for (k in i.key) {
                    if (ikey!="") ikey+=", ";
                    ikey += k+":"+i.key[k];
                    proj[k]=1;
                }
                ikey = ikey + " \t";
                if (i.hasOwnProperty("unique")) ikey +="Unique Index";
                if (i.hasOwnProperty("expireAfterSeconds")) ikey +="TTL Index";
                if (i.hasOwnProperty("sparse")) ikey += "Sparse Index";
                if (i.hasOwnProperty("background")) ikey += "Background Index";
                print("\tIndex " + i.name + " size: " + isize + " \t" + ikey);
      
                if (verbose) {
                    if ( !i.key.hasOwnProperty("_id") ) proj["_id"]=0;
                    docsize=Object.bsonsize(db.getSiblingDB(dbname).getCollection(c).findOne({}, proj ));
                    /* density = ((numdocs*docsize)/bsize).toFixed(2); */
                    ratio = ((numdocs*docsize)/collsize).toFixed(2);
                    print("\tIndex key size is " + docsize + " bytes, of density " + density + " and ratio of " + ratio);
                }
             });
        });
}
