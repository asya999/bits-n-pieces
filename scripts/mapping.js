/*                                                       */
/* top level:  schema { tablename : {} }                 */
/* build up table definitions for multiple tables/collections */
/* create table statement, if pipeline needed, add pipeline */
/* optionally output create view statement */

checkAllFields = function (d, c, doc) {
        var total=db.getSiblingDB(d).getCollection(c).count();
        for (f in doc) {
              var fexists={};
              fexists[f]={"$exists":false}
              var fc=db.getSiblingDB(d).getCollection(c).count(fexists);
              if (fc!=total) {
                  debug("Alert!   Table " + z + " field " + f + " isn't present in every document.  Total is " + total + " and field is missing in " + fc + ".");
                  return false;
              }
        }
        return true;
}

depth=0;
debugOn=false;
pipeline = [];
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
           if (x=="boolean") return("boolean");
           debug("Shouldn't be there! x is not an object, string or number, it's "+x);
           return("UNSUPPORTED");
      }
      if (v.hasOwnProperty("length") && v.length==2 && typeof(v[0])=="number" && typeof(v[1])=="number") return("geo");
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
    if (prefix==undefined || prefix=="") prefix="";
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
                    debug("simple field " + prefix + " (probably array element) " + i);
                    if (elemtype!=null) schema[coll+"__"+prefix+i][prefix+i]=elemtype;
                } else {
                    debug("" + j + " out of " + doc[i].length + ":  " + tojson(schema));
                    debug(tojsononeline(doc[i][j]) + "  " + coll  +  "   " + coll+"__"+prefix+i);
                    makeDocSchema(doc[i][j], coll+"__"+prefix+i, _id, prefix);
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

generateSchema = function(dbname, coll, schema, pipeline) {
    /* cleanse schema of stuff that will get barfed on */
    addUnwind=false;
    dataMayBeMissing=true;
    needProject=false;
    for (c in schema) {
        if (addUnwind) pipeline.push({"$unwind":"$"+c1});
        project={"$project":{}};
        for (key in schema[c]) {
           /* max column length is 62 chars */
           newkey=key;
           if (key.length>62) {
              /* create new shorter name (maybe take out " ", "_", "-", etc. and then truncate  */
              newkey=key.replace(/ /g, '').slice(0,62);
              schema[c][newkey]=schema[c][key];
              /* project the full name to a shortened name */
              delete(schema[c][key]);
           } 
           if (key!="_id") { 
            if ( key!=newkey || (dataMayBeMissing && schema[c][key]!="varchar" )) {
              needProject=true;
              ifNull={};
              ifNull["$ifNull"]=[];
              ifNull["$ifNull"].push('$'+key);
              ifNull["$ifNull"].push(null);
              project["$project"][newkey]=ifNull;
            } else {
              project["$project"][newkey]=1;
            }
          }
        }
        pipeline.push(project);
        if (pipeline.length > 0) {
              pipe=", pipe '" + JSON.stringify(pipeline) + "'";
        } else {
              pipe='';
        }
        print("create foreign table " + c + " ( " +
               JSON.stringify(schema[c]).slice(1,-1).replace(/:/g, ' ').replace(/"boolean"/g, 'boolean').replace(/"numeric[]"/, 'numeric[]') +
               " ) server mongodb_srv options(db '" + dbname + "', collection '" + coll + "'" +
               pipe + ");" );
        print("create view " + c + "_view as select * from " + c + ";");
        if (!addUnwind) { 
            c1=c;
            addUnwind=true;
        }
    }
}

/* database name, collection name (will be used for table name) and how many documents to sample, (default 5) */
makeSchema = function ( dbname, coll, sample ) {
    if (sample==undefined) sample=5;
    schema={};
    schema[coll]={};
    db.getSiblingDB(dbname).getCollection(coll).find().limit(sample).forEach(function(doc) {
        makeDocSchema(doc, coll, doc._id);
    });
    pipe='';
    generateSchema(dbname, coll, schema, pipeline);
}
