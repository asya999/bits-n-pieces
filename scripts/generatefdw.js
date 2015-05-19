debugOn=false;
depth=0;

debug = function (x) {
   if (debugOn) print("DEBUG: " + Array(depth).join('          ') + x);
}

var allTypes = {
    "none"     : -1,
    "geo"     : 0,
    "numeric[]"     : 0,
    "numeric" : 1,
    "boolean" : 2,
    "date"    : 3,
    "timestamp": 4,
    "varchar" : 5,
    "array"   : 6,
};

schema_to_view=function(sch) {
      sv='';  /* format is column, column, column as newname, etc */
      if (sch.hasOwnProperty("fieldmap")) fm=sch.fieldmap;
      var s=sch.schema;
      for (f in s) {
         if (f.startsWith("#")) continue;
         if (!s.hasOwnProperty(f)) continue;
         if (!s[f].hasOwnProperty("#pgtype")) continue;
         if (s[f]["#type"]=="2d") {
             sv = sv + " " + f + '[1] AS "' + f + '.lon", ' + f + '[2] AS "' + f + '.lat",'
         } else if (fm.hasOwnProperty(s[f]["#pgname"])) {
            sv = sv + " " + s[f]["#pgname"] + " AS " + fm[s[f]["#pgname"]] + ",";
         } else if ( f.startsWith("Zip") || f.startsWith("zip") ) {
             sv = sv + ' "' + f + '", ' + ' substr("' + f + '", 1, 5) ' + ' AS "' + f + '_trim5",';
         } else if (s[f]=="timestamp") {
             sv = sv + " " + f + ", " + f + "::date AS " + f + "_as_date,";
         } else {
             sv = sv + " " + JSON.stringify(f) + ",";
         }
      }
      return sv.slice(0,-1);
}

schema_stringify=function(s) {
      ss='';
      for (f in s) {
         if (!s[f].hasOwnProperty("#pgtype")) continue;
         ss = ss + JSON.stringify(f) + " " + s[f]["#pgtype"] + ",";
      }
      return ss.slice(0,-1);
}


mapType = function ( t ) {
    debug("mapType: in type " + t);
    if (typeof(t) == "object" && t.hasOwnProperty("#type")) {
      ttype = firstKeyName(t);
      t=ttype;
    }
    debug("mapType: really type " + t);
    if ( [ "objectid", "text", "string", "category", "null" ].indexOf(t) >= 0 ) return "varchar";
    if ( [ "2d", "2dsphere" ].indexOf(t) >= 0 ) return "numeric[]";
    if ( [ "number" ].indexOf(t) >= 0 ) return "numeric";
    if ( [ "date" ].indexOf(t) >= 0 ) return "timestamp";
    if ( [ "boolean" ].indexOf(t) >= 0 ) return "boolean";
}

firstKeyName = function(o) {
    for (var propName in o) {
        if (o.hasOwnProperty(propName)) {
            return propName;
        }
    }
}

reduceType = function(typeobj) {
     debug("reduceType: " + tojson(typeobj));
     if (typeof(typeobj)!="object") return typeobj;
     types=[];
     if (typeobj.hasOwnProperty("length")) types=typeobj;
     else for (f in typeobj) {
         if (typeobj.hasOwnProperty(f)) types.push(f);
     }
     debug("Types is " + tojson(types));
     if (types.length==1) return types[0];
     if (types.length==0) return "null";
     if ( types.indexOf("null") >= 0 ) {
        return reduceType(types.filter(function(x) { if (x!="null") return x; }));
     }
     /* if multiple non-"null" types, certain ones force rollup to most permissive type */
     if ( types.indexOf("object") >= 0 ) return "string";
     if ( types.indexOf("category") >= 0 ) return "string";
     if ( types.indexOf("string") >= 0 ) return "string";
     if ( types.indexOf("objectid") >= 0 ) return "string";
     if ( types.indexOf("text") >= 0 ) return "text";
     if ( types.indexOf("date") >= 0 ) return "date";
     if ( types.indexOf("number") >= 0 ) return "number";
}

ifnull = function(f, n) {
    if (n==undefined) n=null;
    ifn={};
    ifn["$ifNull"]=[];
    (ifn["$ifNull"]).push(f);
    (ifn["$ifNull"]).push(n);
    return ifn;
}

ifempty = function(f, n) {
    if (n==undefined) n=0;
    ifc={};
    ifc["$cond"]=[];
    ifo={};
    ifo["$eq"]=[];
    ifo["$eq"].push(f);
    ifo["$eq"].push("");
    ifc["$cond"].push(ifo);
    ifc["$cond"].push(n);  /* maybe should be {"$literal":n} */
    ifc["$cond"].push(f);
    return ifc;
}

geo2d=[];
geo2dsphere=[];
arrays=[];

prepSchema = function(mschema, dbname, coll, tablename, result) {
    if (depth==0) topLevel=true;
    else topLevel=false;
    depth++;
    debug(tojson(mschema));

    if (tablename==coll) throw "cannot be passed in tablename same as collection name";
    if (tablename==undefined) tablename=coll;

    if (result==undefined) result={};
    if (!result.hasOwnProperty(tablename)) result[tablename]={};
    if (!result[tablename].hasOwnProperty("dbname")) result[tablename]["dbname"]=dbname;
    if (!result[tablename].hasOwnProperty("coll")) result[tablename]["coll"]=coll;
    if (!result[tablename].hasOwnProperty("schema")) result[tablename]["schema"]={};
    if (!result[tablename].hasOwnProperty("pipe")) result[tablename]["pipe"]=[];
    if (!result[tablename].hasOwnProperty("fieldmap")) result[tablename]["fieldmap"]={};

    debug("Depth is " + depth + " " + dbname + " " + tablename + " result is " + tojson(result));

    numRecords=mschema["#count"];

    for (field in mschema) {
        if ( ! mschema.hasOwnProperty(field) ) continue;
        if ( '__schema' == field ) continue;  /* skip metadata */
        if ( field.startsWith("#") ) continue;  /* skip metadata */
        debug("doing field ********************** " + field);

        currentfield=mschema[field];
        
        if ( geo2d.indexOf(field) >= 0 ) {
           debug(field + " is a 2d index geo field!!!");
           currentfield["#type"]="2d";
           currentfield["#proj"]=ifnull("$"+field, [null,null]);
           delete(currentfield["#array"]);
           result[tablename]["schema"][field]=currentfield;
           result[tablename]["fieldmap"][field+"[1]"]=field+".lon";
           result[tablename]["fieldmap"][field+"[2]"]=field+".lat";
           continue;
        }
        /* here we could support separate table or same one for 2dsphere, depending on whether we support non-points */
        if ( geo2dsphere.indexOf(field) >= 0 ) {
           debug(field + " is a 2dsphere index geo field!!!");
           currentfield["#type"]="2dsphere";
           currentfield["#proj"]=ifnull("$"+field+".coordinates", [null,null]);
           debug("Going to delete " + field+".type and " + field+".coordinates fields");
           delete(mschema[field+".type"]);
           delete(mschema[field+".coordinates"]);
           result[tablename]["schema"][field]=currentfield;
           result[tablename]["fieldmap"][field+".coordinates[1]"]=field+".coordinates.lon";
           result[tablename]["fieldmap"][field+".coordinates[2]"]=field+".coordinates.lat";
           continue;
        }
        /* if it's an array, we will send the whole thing into prepSchema by itself */
        if ( currentfield.hasOwnProperty("#array") && currentfield["#array"] ) {
           debug("currentfield has #array=true field is " + field);
           delete(currentfield["#array"]);
           subtable=tablename+"__"+field;
           result[subtable]={};
           result[subtable]["pipe"]=[];
           result[subtable]["pipe"].push({"$unwind":'$'+field});
           result[subtable]["fieldmap"]={};
           fschema={}
           if (currentfield["#type"]=="object" || currentfield["#type"].hasOwnProperty("object") ) {
              fschema[field]={}
              fschema[field]["_id"]=mschema["_id"];
              fschema[field]["_id"]["#viewname"]=coll+"._id";
              for (g in currentfield) 
                 if (currentfield.hasOwnProperty(g) && !g.startsWith("#")) 
                     fschema[field][field+"."+g]=currentfield[g]; 
              result=prepSchema(fschema[field], dbname, coll, subtable, result);
           } else {
              fschema["_id"]=mschema["_id"];
              fschema[field]=currentfield; 
              result=prepSchema(fschema, dbname, coll, subtable, result);
           }
           currentfield["#type"]="subtable";
           delete(currentfield);
           continue;
        }
        if (! currentfield.hasOwnProperty("#type")) throw "Field " + field + " does not have #type! just " + tojsononeline(currentfield);
        if (currentfield["#type"]=="object" || currentfield["#type"].hasOwnProperty("object") ) {  
           delete(currentfield);
           continue;
        }
        debug("left with field " + field + " currentfield is " + tojsononeline(currentfield));
        result[tablename]["schema"][field]={};
        for (g in currentfield) {
           if (currentfield.hasOwnProperty(g)) result[tablename]["schema"][field][g]=currentfield[g];
        }
    }
    proj = {};
    proj["$project"] = {};
    pr = proj["$project"];
    needProj = false;

    sch = result[tablename]["schema"];
    debug("Table is " + tablename);
    debug(sch);
    for (f in sch) {
        if (f.startsWith("#") || f.startsWith("__")) continue;
        /*  unfinished - if the field name isn't legal postgres column then we need to do some hoop jumping */
        if (f.length>62) {  /* should check if it already has #pgname? */
           newf=f.replace(/ /g,'').slice(0,62);
           sch[f]["#pgname"]=newf;
           if (!needProj) needProj=true;
           if ( !sch[f].hasOwnProperty("#proj") ) { 
              sch[f]["#proj"]={};
              sch[f]["#proj"][newf]=ifnull("$"+f);
           } else {
              sch[f]["#proj"][newf]=f; // TEMPORARY
           }
           result[tablename]["fieldmap"][newf]=f;
        }
        sch[f]["#pgtype"]=mapType(reduceType(sch[f]["#type"]));
        if (f.startsWith("Zip") || f.startsWith("zip")) sch[f]["#pgtype"]="varchar";

        debug("field " + f + " was " + tojson(sch[f]["#type"]) + " but turned into " + sch[f]["#pgtype"] );

        prf="$"+f;
        if (sch[f].hasOwnProperty("#proj")) {
           prf=sch[f]["#proj"];
        } 
        if (sch[f]["#pgtype"]!="varchar") {
           prf=ifnull(prf);
        } 
        if (sch[f]["#pgtype"]=="numeric") {
           prf=ifempty(prf);
        } 

        if (prf!="$"+f) {
           if (!needProj) needProj=true;
           pr[f]=prf;
        } else {
           pr[f]=1;
        }
    }
    if (needProj) {
        result[tablename]["pipe"].push(proj);
    }
    depth--;
    return result;
}

generatePGSchema = function(tablename, pgschema) {
    print("DROP FOREIGN TABLE IF EXISTS " + tablename + " CASCADE;");
    print("CREATE FOREIGN TABLE " + tablename + " ( ", schema_stringify(pgschema.schema), " ) ");
    print("     SERVER mongodb_srv OPTIONS(db '" + pgschema.dbname + "', collection '" + pgschema.coll + "'");
    if (pgschema.pipe.length> 0) print(", pipe '", tojsononeline(pgschema.pipe), "'");
    print(", fieldmap '", tojsononeline(pgschema.fieldmap), "'");
    print(");" );

    print("-- view can be edited to transform field names further ");
    print("CREATE VIEW " + tablename + "_view AS SELECT ");
    print(schema_to_view(pgschema));
    print(" FROM " + tablename + ";");
    print("");
    pgpipe="";
}

doSchema = function (dbname, coll, sample, debugopt) {
    if (debugopt!=undefined) debugOn=debugopt; 
    if (sample==undefined) sample=100;

    colls=[];
    if (coll == undefined) colls=db.getSiblingDB(dbname).getCollectionNames();
    else colls.push(coll);

    colls.forEach(function(c) {
       var sch=db.getSiblingDB(dbname).getCollection(coll).schema({flat:true});

       /* try to figure out if there are any geo fields */
       db.getSiblingDB(dbname).getCollection(c).getIndexes().forEach(function(i) { 
           if (i.name.endsWith("2d")) geo2d.push(firstKeyName(i.key)); 
           if (i.name.endsWith("2dsphere")) geo2dsphere.push(firstKeyName(i.key)); 
       });
   
       /* transform contents of sch into result */
       pschema = prepSchema(sch, dbname, c);

       /* can keep doing this for other collections in this db */
       for (t in pschema) {
          generatePGSchema(t, pschema[t]);
       }
    });
}
