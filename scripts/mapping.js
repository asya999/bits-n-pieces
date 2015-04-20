figureOutType = function ( v ) {
      var x = typeof(v);
      if (debug) print("** in figureOutType " + v + " " + x);
      if (x != "object") {
           if (x=="string") return("varchar");
           if (x=="number") return("numeric");
      }
      if (v instanceof ObjectId)  return("varchar");
      if (v instanceof Date)  return("date");
      if (v instanceof NumberInt) return("numeric");
      if (v instanceof NumberLong) return("numeric");
      if (v instanceof BinData) return("UNSUPPORTED");
      return("UNDEFINED")
}

/* given document create wrapper create assuming any top level array should be unwound, inner arrays ignored */
makeWrapper=function(doc, tablename, dbname, collectionname, pipeline, project, prefix, schema ) {
    if (schema == undefined) schema={};
    if (prefix == undefined) prefix="";
    if (pipeline == undefined) pipeline=[];
    if (project == undefined) project={"$project":{}};
    for (i in doc) {
         typeis=figureOutType(doc[i]);
         if (typeis!="UNDEFINED") {
             schema[i]=typeis;
             project["$project"][i]="$"+prefix+i;
         } else {
             if ( doc[i].hasOwnProperty("length") ) {
                pipeline.push({"$unwind":"$"+i});
                for (j=0; j<doc[i].length; j++) {
                    for (k in doc[i][j]) {
                      jtype=figureOutType(doc[i][j][k]);
                      if (jtype != "UNDEFINED") {
                        schema[i+"__"+k]=jtype;
                        project["$project"][i+"__"+k]="$"+i+"."+k;
                      } else if ( ! doc[i][j][k].hasOwnProperty("length") ) {
                           schema[i+"__"+k]="varchar";
                           project["$project"][i+"__"+k]="$"+i+"."+k;
                           /* project["$project"][i+"__"+k]={"$literal":JSON.stringify(doc[i][j][k]); }; */
                      }
                    }
                }
             } else {
                schema[i]="varchar";
                project["$project"][i]={"$literal":JSON.stringify(doc[i])};
             } 
         }
    }
    pipeline.push(project);
    return "create foreign table " + tablename + " ( " + 
                  JSON.stringify(schema).slice(1,-1).replace(/:/g, ' ') + 
                  " ) server mongodb_srv options(db '" + dbname + "', collection '" + collectionname + "', pipe '" + 
                  JSON.stringify(pipeline) + "' );"
}

/* given document, create wrapper for its non-arrays and a separate wrapper for each top level array */
makeSubtableWrappers=function(doc, tablename, dbname, collectionname) {
    var schema={};
    var pipeline=[];
    var project={"$project":{}};
    var createCmd=[];
    needProject=false;
    for (i in doc) {
      if ( typeof doc[i] == "object" && doc[i].hasOwnProperty("length") ) {
         /* make another table */
         pr={"$project":{}};
         sch={};
         pr["$project"][collectionname+"_id"]="$_id";
         /* sch[collectionname+"_id"]=figureOutType(doc["_id"]); */
         sch["_id"]=figureOutType(doc["_id"]); /* _id of the "parent" should be filter-able */
         print("calling makeWrapper with " + tablename+"__"+i);
         createCmd.push(makeWrapper(doc[i][0], tablename+"__"+i, dbname, collectionname, [{"$unwind":"$"+i}], pr, i+".", sch ));
      } else { 
         typeis=figureOutType(doc[i]);
         if (typeis!="UNDEFINED") {
             schema[i]=typeis;
             project["$project"][i]=1;
         }
      }
    }
    pipeline.push(project);
    createCmd.push("create foreign table " + tablename + " ( " + 
               JSON.stringify(schema).slice(1,-1).replace(/:/g, ' ') + 
               " ) server mongodb_srv options(db '" + dbname + "', collection '" + collectionname + "', pipe '" + 
               JSON.stringify(pipeline) + "' );" );
    return createCmd;
}
