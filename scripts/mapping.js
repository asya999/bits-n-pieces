/*                                                            */
/* top level:  pipeline { tablename : [] }                 */
/* top level:  project { tablename : {} }                 */
/* top level:  schema { tablename : {} }                 */
/* build up table definitions for multiple tables/collections */
depth=0;
debugOn=true;
pipeline = {}
project = {}
schema = {}

debug = function (x) {
   if (debugOn) print("DEBUG: " + Array(depth).join(' ') + x);
}

figureOutType = function ( v ) {
      if (v == undefined) return(null);
      if (v == null) return(null);
      var x = typeof(v);
      if (x != "object") {
           if (x=="string") return("varchar");
           if (x=="number") return("numeric");
           debug("Shouldn't be there!");
           return("UNSUPPORTED");
      }
      if (v.hasOwnProperty("length") && v.length==2 && typeof(v[0])=="number") return("geo");
      if (v.hasOwnProperty("length")) return("array");
      if (v instanceof ObjectId)  return("varchar");
      if (v instanceof Date)  return("date");
      if (v instanceof NumberInt) return("numeric");
      if (v instanceof NumberLong) return("numeric");
      if (v instanceof BinData) return("UNSUPPORTED");
      return("DOC")
}

makeDocSchema = function(doc, coll, _id, prefix) {
    depth++;
    debug("depth " + depth + " and prefix:  " + prefix);
    // debug("" + depth + ":  " + prefix + " " + tojson(schema));
    if (prefix==undefined) prefix="";
    else prefix=prefix+".";
    for (i in doc) {
        doctype = figureOutType(doc[i]);
        debug("i: "+i+"   doctype: " + doctype);
        if (doctype=="null" || doctype=="UNSUPPORTED") continue;
        else if (doctype=="geo") {
            schema[coll][prefix+i]="numeric[]";
        } else if (doctype=="array") { 
            if ( !schema.hasOwnProperty(coll+"__"+prefix+i)) schema[coll+"__"+prefix+i]={};
            schema[coll+"__"+prefix+i][coll+"_id"]=figureOutType(_id); /* nested arrays - need top level _id */
            /* for (j=0; j<5 && j<doc[i].length; j++) { */ j=0;
                elemtype=figureOutType(doc[i][j]);
                if (elemtype!="DOC") {
                    debug("simple field " + prefix + " (probably array element) " + i + " " + j);
                    schema[coll+"__"+prefix+i][prefix+i]=elemtype;
                } else {
                    debug("" + j + " out of " + doc[i].length + ":  " + tojson(schema));
                    debug(doc[i][j], coll, _id, coll+"__"+prefix+i);
                    makeDocSchema(doc[i][j], coll, _id, coll+"__"+prefix+i);
                }
            // }
        } else if (doctype=="DOC") {
            debug("Calling recursively in DOC for i " + i + " "  + prefix+i + "  " + tojsononeline(doc[i]));
            makeDocSchema(doc[i], coll, _id, prefix+i);
        } else if (doctype!="UNSUPPORTED") {
            schema[coll][prefix+i]=doctype;
        }
    }
    depth--;
}

makeSchema = function ( dbname, coll ) {
    schema={};
    schema[coll]={};
    db.getSiblingDB(dbname).getCollection(coll).find().limit(1).forEach(function(doc) {
        makeDocSchema(doc, coll, doc._id);
    });
    printjson(schema);
}
