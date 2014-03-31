load(d+"showIndexSizes.js");

show_extent_space = function (obj) {
      var extA=obj.extents;
      assert("Extent length is not same as extentCount!", obj.extentCount==extA.length);
      totalFiles=[];
      totalFilesAndSizes=[];
      totalSize=0;
      var res={};
      res.extents=[];
      for (i=0; i < obj.extentCount; i++) {
          efile=extA[i].loc.split(":")[0];
          if (totalFiles.indexOf(efile)<0) {
              totalFiles.push(efile);
          }
          esize=extA[i].size;
          totalSize+=esize;
          res.extents.push({ "file":efile, "size":esize });
      }
      print(obj.ns + ": " + obj.extentCount + " extents");
      print("\tSize: " + totalSize, " ("+ Math.round(totalSize/(1024*1024)*1000)/1000 +"GBs)");
      if (obj.extentCount > 1) {
         if (totalFiles.length > 1) {
              print("\t\tExtents stored across " + totalFiles.length + " files.");
         }
      }
      res.ns=obj.ns;
      res.numExtents=obj.extentCount;
      res.numFiles=totalFiles.length;
      res.files=totalFiles;
      return res;
}

show_db_sizes = function (dbname, verbose) {
        var collectionList=db.getSiblingDB(dbname).getCollectionNames();
        var stats=db.getSiblingDB(dbname).stats();
        var statsGB=db.getSiblingDB(dbname).stats(1024*1024*1024);
        files={};
        collectionList.forEach(function(c) {
             var v=db.getSiblingDB(dbname).getCollection(c).validate(true);
             var res=show_extent_space(v);
             res.extents.forEach(function(e) {
                if ( ! files.hasOwnProperty(e.file) ) {
                     files[e.file] = {};
                     files[e.file]["collections"] = [];
                     files[e.file]["size"] = 0;
                }
                files[e.file]["size"] += e.size;
                files[e.file]["collections"].push({"ns":res.ns, "size":esize});
             });
        });
        /* printjson(files); */
        for (i in files) {
            numExt=files[i].collections.length;
            colls = [];
            sizes = [];
            files[i].collections.forEach(function(e) {
               if (colls.indexOf(e.ns) < 0) { 
                  colls.push(e.ns);
                  sizes.push(e.size);
               }
            });
            print("File " + i + " size:  \t" + files[i]["size"] + "  \t " + Math.round(files[i]["size"]/(1024*1024*1024)*1000)/1000 +"GBs.  \t This represents " + numExt + " extents in " + colls.length + " different collections");
            if (verbose) {
                for (i=0; i<colls.length;i++) {
                   print("\t"+colls[i]+" ( " + sizes[i] + " )");
                }
            }
        }
        // printjson(stats);
        // printjson(statsGB);
}

printCollStats = function (scale) {
    if (arguments.length > 1) {
        print("printCollectionStats() has a single optional argument (scale)");
        return;
    }
    if (typeof scale != 'undefined') {
        if(typeof scale != 'number') {
            print("scale has to be a number >= 1");
            return;
        }
        if (scale < 1) {
            print("scale has to be >= 1");
            return;
        }
    }
    unit="  ";
    if (scale==1024) unit="KB";
    if (scale==1024*1024) unit="MB";
    if (scale==1024*1024*1024) unit="GB";
    var mydb = db;
    db.getCollectionNames().forEach(
        function(z) {
            var stats=mydb.getCollection(z).stats(scale);
            print( "ns: " + stats.ns + "\tcount: " + stats.count + "\t size: " + Math.round(stats.size) + unit);
            print( "\t   avgObjSize: " + Math.round(stats.avgObjSize) + "\tstorageSize: " + stats.storageSize + unit + "\t padding: " + Math.round(100*stats.paddingFactor)/100 + unit);
            print( "\t   numIndexes: " + stats.nindexes + "\tIndexSize: " + Math.round(stats.totalIndexSize) + unit );
        }
    );
}

