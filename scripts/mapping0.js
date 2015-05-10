/* build up table definitions for multiple tables/collections */
/* top level:  schema { tablename : {} }                 */
/* top level:  project { tablename : {} }                 */
/* top level:  pipeline { tablename : [] }                 */
/*                                                            */

schema = {}
project = {}
pipeline = {}
debugOn=false;

debug = function(x) {
   if (debugOn) print(x);
}

figureOutType = function ( v ) {
      var x = typeof(v);
      if (debug) print("** in figureOutType " + v + " " + x);
      if (x != "object") {
           if (x=="string") return("varchar");
           if (x=="number") return("numeric");
      }
      if (v == null) return("null");
      if (v instanceof ObjectId)  return("varchar");
      if (v instanceof Date)  return("date");
      if (v instanceof NumberInt) return("numeric");
      if (v instanceof NumberLong) return("numeric");
      if (v instanceof BinData) return("UNSUPPORTED");
      return("SUBDOC")
}

addField = function (f, type, table, handleNull=true ) {
    schema[table][f]=type;
    if (handleNull) {
         ifNull={};
         ifNull["$ifNull"]=[];
         ifNull["$ifNull"].push("$"+i+'.'+j);
         ifNull["$ifNull"].push(null);
         project[table]["$project"][f]=ifNull;
    } else {
         project[table]["$project"][f]="$"+f;
    }
}

addFieldSchema = function (f, table  ) {
}

/* given document create wrapper create assuming any top level array should be unwound, inner arrays ignored */
makeWrapper=function(doc, tablename, dbname, collectionname, _pipeline, _project, _prefix, _schema ) {
    if (_schema == undefined) _schema={};
    if (_prefix == undefined) _prefix="";
    if (_pipeline == undefined) _pipeline=[];
    if (_project == undefined) _project={"$project":{}};
    print("project already has " + tojsononeline(_project));
    print("schema already is " + tojsononeline(_schema));
    print("pipeline already is " + tojsononeline(_pipeline));
    print("prefix already is " + tojsononeline(_prefix));
    /* doc is first element of an array but could be of documents or of primitive types */
    typeofdoc=figureOutType(doc);
    if (typeofdoc != "UNSUPPORTED" && typeofdoc != "SUBDOC") {
      _schema[_prefix]=typeofdoc;
      _project["$project"][_prefix]="$"+_prefix;
    } else {
      for (i in doc) {
         if (typeof(i)=="number") { /* assume array of scalars */
            print("doc is an array of " + doc.length);
         }
         if (doc[i] == null) continue;
         typeis=figureOutType(doc[i]);
         print("Type of " + i + " is " + typeis);
         if (typeis!="UNDEFINED") {
             _schema[i]=typeis;
             _project["$project"][i]="$"+_prefix+"."+i;
         } else {
             if ( doc[i].hasOwnProperty("length") ) {
                _pipeline.push({"$unwind":"$"+i});
                for (j=0; j<doc[i].length; j++) {
                    for (k in doc[i][j]) {
                      jtype=figureOutType(doc[i][j][k]);
                      if (jtype != "UNDEFINED") {
                        _schema[i+"__"+k]=jtype;
                        _project["$project"][i+"__"+k]="$"+i+"."+k;
                      } else if ( ! doc[i][j][k].hasOwnProperty("length") ) {
                           _schema[i+"__"+k]="varchar";
                           _project["$project"][i+"__"+k]="$"+i+"."+k;
                           /* project["$project"][i+"__"+k]={"$literal":JSON.stringify(doc[i][j][k]); }; */
                      }
                    }
                }
             } else {
                _schema[i]="varchar";
                _project["$project"][i]={"$literal":JSON.stringify(doc[i])};
             } 
         }
      }
    }
    _pipeline.push(_project);
    return "create foreign table " + tablename + " ( " + 
                  JSON.stringify(_schema).slice(1,-1).replace(/:/g, ' ') + 
                  " ) server mongodb_srv options(db '" + dbname + "', collection '" + collectionname + "', pipe '" + 
                  JSON.stringify(_pipeline) + "' );"
}

isArray=function(f) {
  if ( typeof f == "object" && f != null && f.hasOwnProperty("length") ) return true;
  else return false;
}

/* given document, create wrapper for its non-arrays and a separate wrapper for each top level array */
makeSubtableWrappers=function(doc, tablename, dbname, collectionname) {
    var needIfNull=false;
    var needProject=false;
    for (i in doc) {
      if ( isArray(doc[i]) ) {
         debug("Need to make a subtable " + i);
         pr={"$project":{}};
         sch={};
         pr["$project"][collectionname+"_id"]="$_id";
         sch[collectionname+"_id"]=figureOutType(doc["_id"]); /* _id of the "parent" should be filter-able */
         print("calling makeWrapper with " + tablename+"__"+i + " passing first element of " + i );
         createCmd.push(makeWrapper(doc[i][0], tablename+"__"+i, dbname, collectionname, [{"$unwind":"$"+i}], pr, i, sch ));
      } else { 
         typeis=figureOutType(doc[i]);
         print("Making field " + typeis + " for " + i);
         if (typeis=="UNDEFINED") {
             needProject=true;
             /* subdocument */
             for (j in doc[i]) {
                 typeofjis = figureOutType(doc[i][j]);
                 if (typeofjis != "UNDEFINED") {
                     schema[i+'.'+j]=typeofjis;
                     ifNull={};
                     ifNull["$ifNull"]=[];
                     ifNull["$ifNull"].push("$"+i+'.'+j);
                     ifNull["$ifNull"].push(null);
                     project["$project"][i+'.'+j]=ifNull;
                 }
             }
         } else {
             schema[i]=typeis;
             if (i != "_id") {
                 ifNull={};
                 ifNull["$ifNull"]=[];
                 ifNull["$ifNull"].push('$'+i);
                 ifNull["$ifNull"].push(null);
                 project["$project"][i]=ifNull;
             }
         }
      }
    }
    pipe='';
    if (needProject) {
      pipeline.push(project);
      pipe=", pipe '" + JSON.stringify(pipeline) + "'"; 
    }
    createCmd.push("create foreign table " + tablename + " ( " + 
              JSON.stringify(schema).slice(1,-1).replace(/:/g, ' ') + 
              /* tojsononeline(schema).slice(1,-1).replace(/:/g, ' ').replace(/\"/g, '') + */
              " ) server mongodb_srv options(db '" + dbname + "', collection '" + collectionname + "'" + 
              pipe + ");" );
    for (i in createCmd)
        print(createCmd[i]);
}

makeSchema(dbname, collectionname, tablename) {
    db.getSiblingDb(dbname).getCollection(collectionname).find().limit(100).forEach(function(doc) {
        makeSubtableWrapper(doc, tablename, dbname, collectionname);
    });
    /* at this point we have a schema document which should have a subdocument for every table we need to create */
    printjson(schema);
}
