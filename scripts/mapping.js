/*                                                       */
/* top level:  schema { tablename : {} }                 */
/* build up table definitions for multiple tables/collections */
/* create table statement, if pipeline needed, add pipeline */
/* optionally output create view statement */

depth=0;
debugOn=false;
var _schema={};
var _pipeline=[];
var _project={};

var allTypes = {
    "none"     : -1,
    "geo"     : 0,
    "numeric[]"     : 0,
    "numeric" : 1,
    "boolean" : 2,
    "date"    : 3,
    "timestampgz": 4,
    "varchar" : 5,
    "array"   : 6,
};

schema_to_view=function(s) {
      sv='';  /* format is column, column, column as newname, etc */
      for (f in s) {
         if (s[f]=="numeric[]") {
             sv = sv + " " + f + "[1] AS long, " + f + "[2] as lat,"
         } else if ( f.startsWith("Zip") || f.startsWith("zip") ) {
             sv = sv + " " + f + ", " + " substr(" + f + ", 1, 5) " + " AS " + f + "_trim5,";
         } else if (s[f]=="timestampgz") {
             sv = sv + " " + f + ", " + f + "::date AS " + f + "_as_date,";
         } else {
             sv = sv + " " + f + ",";
         }
      }
      return sv.slice(0,-1);
}

schema_stringify=function(s) {
      ss='';
      for (f in s) {
         ss = ss + f + " " + s[f] + ",";
         // ss = ss + "\"" + f + "\" " + s[f] + ",";
      }
      return ss.slice(0,-1);
}

checkAllFields = function (d, c, doc, field) {
    var total=db.getSiblingDB(d).getCollection(c).count();
    if (total == 0) return false;
    debug("Field is " + field);
    if (field == undefined) {
        for (f in doc) {
              if (!checkAllFields(d, c, doc, f)) return false;
        }
        return true;
    } else {
        var fnotexists={};
        fnotexists[field]={"$exists":false}
        debug("fnotexists is " + tojsononeline(fnotexists));
        var fc=db.getSiblingDB(d).getCollection(c).count(fnotexists);
        if (fc>0) {
            debug("Table " + c + " field " + field + " is missing from " + fc + " out of " + total + ".");
            return false;
        } else return true;
    }
}

debug = function (x) {
   if (debugOn) print("DEBUG: " + Array(depth).join(' ') + x);
}

figureOutType = function ( v, i ) {
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
      if (v.hasOwnProperty("length") && v.length==2 && i!= undefined && i== i.endsWith(".coordinates") ) return("geo");
      if (v.hasOwnProperty("length") && v.length==2 && typeof(v[0])=="number" && typeof(v[1])=="number") return("geo");
      if (v.hasOwnProperty("length")) return("array");
      if (v instanceof ObjectId)  return("varchar");
      if (v instanceof Date)  return("timestamptz");
      if (v instanceof NumberInt) return("numeric");
      if (v instanceof NumberLong) return("numeric");
      if (v instanceof BinData) return("UNSUPPORTED");
      return("DOC")
}

makeDocSchema = function(doc, coll, _id, prefix, projectPrefix) {

    depth++;
    debug("depth " + depth + " and prefix:  " + prefix);
    /* top level document has prefix "" otherwise prefix has "arrayParent." */
    if (prefix==undefined || prefix=="") { topLevel=true; }
    else { topLevel=false; }

    for (i in doc) {

        if (topLevel) {
            fieldName=i;
            projectName=1;
        } else {
            fieldName=prefix+"."+i;
            projectName="$"+projectPrefix+"."+i;
        }

        doctype = figureOutType(doc[i], i);

        debug("i: "+i+"   doctype: " + doctype);

        if (doctype==null || doctype=="UNSUPPORTED") continue;

        if (_schema[coll].hasOwnProperty(fieldName) ) {
            /* we already have some presumed type, so we should ... make it more precise or/and not overwrite it */
            existingType =  _schema[coll][fieldName]['doctype'];
        } else {
            existingType = "none";
            _schema[coll][fieldName]={};
            _schema[coll][fieldName]["doctype"]=doctype;
            _schema[coll][fieldName]["pgtype"]=doctype;
            _schema[coll][fieldName]["value"]=projectName;
        }

        debug("" + i + ": "+existingType+" doctype: " + doctype + " allTypes " + allTypes[doctype] + " <= " + allTypes[existingType]);
        debug((allTypes[doctype]<= allTypes[existingType]) ?  "      will skip " : "     will continue with type " + doctype );

        if (allTypes[doctype]<allTypes[existingType]) continue;

        if (doctype=="geo") {
            _schema[coll][fieldName]["pgtype"]="numeric[]";
            _schema[coll][fieldName]["value"]="numeric[]";
        } else if (doctype=="array") { 
            /* add empty entry to top level _schema for this array */
            if ( ! _schema.hasOwnProperty(coll+"__"+fieldName) ) { _schema[coll+"__"+fieldName]={}; }
            /* add _id/foreign key to _schema for this array */
            if ( ! _schema[coll+"__"+fieldName].hasOwnProperty(coll+"_id")) _schema[coll+"__"+fieldName][coll+"_id"]={};
            _schema[coll+"__"+fieldName][coll+"_id"]["value"]="$_id";
            _schema[coll+"__"+fieldName][coll+"_id"]["doctype"]=typeof(_id);
            _schema[coll+"__"+fieldName][coll+"_id"]["pgtype"]=figureOutType(_id); /* nested arrays - need top level _id */
            /* for (j=0; j<5 && j<doc[i].length; j++) { */ j=0;
            elemtype=figureOutType(doc[i][0]);
            if ( ! _schema[coll+"__"+fieldName].hasOwnProperty([fieldName]) ) _schema[coll+"__"+fieldName][fieldName]={}
            if ( ! _schema[coll+"__"+fieldName][fieldName].hasOwnProperty("doctype") ) _schema[coll+"__"+fieldName][fieldName]={}
            if ( ! _schema[coll+"__"+fieldName][fieldName].hasOwnProperty("doctype") ) _schema[coll+"__"+fieldName][fieldName]={}
            if (elemtype!="DOC") {
                    debug("simple field " + prefix + " (probably array element) " + i);
                    if (elemtype!=null) _schema[coll+"__"+fieldName][fieldName]["doctype"]=typeof(doc[i][0]);
                    if (elemtype!=null) _schema[coll+"__"+fieldName][fieldName]["pgtype"]=elemtype;
                    if (elemtype!=null) _schema[coll+"__"+fieldName][fieldName]["value"]="$"+fieldName;
            } else {
                    debug("" + 0 + " out of " + doc[i].length + ":  " + tojson(_schema));
                    debug(tojsononeline(doc[i][j]) + "  " + coll  +  "   " + coll+"__"+fieldName);
                    makeDocSchema(doc[i][0], coll+"__"+fieldName, _id, prefix, fieldName);
            }
            // }
        } else if (doctype=="DOC") {
            debug("Calling recursively in DOC for i " + i + " "  + fieldName + "  " + tojsononeline(doc[i]));
            makeDocSchema(doc[i], coll, _id, fieldName, fieldName);
        }
    }
    depth--;
}

generateSchema = function(dbname, coll) {
    debug("generating schema");
    /* cleanse schema of stuff that will get barfed on */
    addUnwind=false;
    prefix='';
    for (c in _schema) {
        debug("------ " + c + " -----------");
        debug(tojson(_schema[c]));
        needProject=false;
        _pipeline=[];
        _project={"$project":{}};
        if (addUnwind) {
            _pipeline.push({"$unwind":"$"+c.slice(c1.length)});
            needProject=true;
        }
        for (key in _schema[c]) {
           debug("key is ",key,addUnwind);
           if (addUnwind && key==c1.slice(0,-2)) {
              delete(_schema[c][key]);
              continue;
           }
           if (_schema[c][key]=="array") {
              delete(_schema[c][key]);
              continue;
           }
           /* max column length is 62 chars */
           newkey=key;
           if (key.length>62) {
              /* create new shorter name (maybe take out " ", "_", "-", etc. and then truncate  */
              newkey=key.replace(/ /g, '').slice(0,62);
              _schema[c][newkey]=_schema[c][key];
              /* project the full name to a shortened name */
              delete(_schema[c][key]);
           } 
           if (key.indexOf(" ") > 0) {
              newkey="\""+key+"\"";
              _schema[c][newkey]=_schema[c][key];
              delete(_schema[c][key]);
           }
           if (key!="_id") { 
              dataMayBeMissing=checkAllFields(dbname, coll, _schema[c],key);
              debug("Data may be missing for field " + key + ": " + dataMayBeMissing);
              debug("In Project " + _schema[c][key] + " needProject is now " + needProject);
              if ( key!=newkey || checkAllFields(dbname,coll,_schema[c],_schema[c][key]) || _schema[c][key]!="varchar" ) {
                needProject=true;
                ifNull={};
                ifNull["$ifNull"]=[];
                ifNull["$ifNull"].push('$'+key);
                ifNull["$ifNull"].push(null);
                _project["$project"][newkey]=ifNull;
              } else {
                debug(key, newkey, dataMayBeMissing, _schema[c][key]);
                _project["$project"][newkey]=1;
              }
              debug("                                      and  now " + needProject);
           } 
        }
        if (addUnwind) {
            _project["$project"][c1.slice(0,-2)+"_id"]="$_id";
        }
        if (needProject) _pipeline.push(_project);
        schemaString=schema_stringify(_schema[c]);
        viewString=schema_to_view(_schema[c]);
        print("DROP FOREIGN TABLE IF EXISTS " + c + " CASCADE;");
        print("CREATE FOREIGN TABLE " + c + " ( ", schema_stringify(_schema[c]), " ) ");
        print("     SERVER mongodb_srv OPTIONS(db '" + dbname + "', collection '" + coll + "'");
        if (_pipeline.length > 0) {
	   print(", pipe '", tojsononeline(_pipeline).replace(/""/g,'"'), "'");
        }
        print(");" );
        print("-- view can be edited to transform field names further ");
        print("CREATE VIEW " + c + "_view AS SELECT ");
        print(viewString);
        print(" FROM " + c + ";");
        print("");
        if (!addUnwind) { 
            c1=c+"__";
            addUnwind=true;
            prefix=c+'.';
        }
    }
}

cleanseSchema = function() {
     debug("to be implemented - should we review all column names for safety?  ");
}

/* database name, collection name (will be used for table name) and how many documents to sample, (default 5) */
makeSchema = function ( dbname, coll, sample, debugopt ) {
    if (debugopt!=undefined) debugOn=debugopt; 
    if (sample==undefined) sample=50;
    _schema[coll]={};
    db.getSiblingDB(dbname).getCollection(coll).find().limit(sample).forEach(function(doc) {
        makeDocSchema(doc, coll, doc._id);
    });
    cleanseSchema();
    generateSchema(dbname, coll);
}

useSchema = function (dbname, coll, sample, debugopt) {
    if (debugopt!=undefined) debugOn=debugopt; 
    if (sample==undefined) sample=50;
    _schema[coll]={};
    var sch=db.getSiblingDB(dbname).getCollection(coll).schema({flat:false});
    /* transform contents of sch into _schema */
    cleanseSchema();
    generateSchema(dbname, coll);

}
