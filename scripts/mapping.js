makeWrapper=function(doc, tablename, dbname, collectionname) {
    haveArray=false;
    schema={};
    pipeline=[];
    project={"$project":{}};
    for (i in doc) {
         typeis=figureOutType(doc[i]);
         if (typeis!="UNDEFINED") {
             schema[i]=typeis;
             project["$project"][i]=1;
         } else {
             if ( doc[i].hasOwnProperty("length") ) {
                pipeline.push({"$unwind":"$"+i});
                haveArray=true;
                for (j=0; j<doc[i].length; j++) {
                 for (k in doc[i][j]) { 
                   jtype=figureOutType(doc[i][j][k]);
                   if (jtype != "UNDEFINED") {
                     schema[i+"__"+k]=jtype;
                     project["$project"][i+"__"+k]="$"+i+"."+k;
                   } else if ( ! doc[i][j][k].hasOwnProperty("length") ) { schema[i+"__"+k]=JSON.stringify(doc[i][j][k]); }
                }
               }
             } else {
                schema[i]="varchar";
                project["$project"][i]={"$literal":JSON.stringify(doc[i])};
             } 
         }
    }
    if (haveArray) pipeline.push(project);
    createCmd =   "create foreign table " + tablename + " ( " + 
                  JSON.stringify(schema).slice(1,-1).replace(/:/g, ' ') + 
                  " ) server mongodb_srv options(db '" + dbname + "', collection '" + collectionname + "', pipe '" + 
                  JSON.stringify(pipeline) + "' );"
    return createCmd;
}
