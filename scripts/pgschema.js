/*
   given a document in format:
   { tablename : {
       dbname: "ourdb",
       coll: "people",
       schema: { },
       pipe: [ {"$unwind":"$foo"} ],
       fieldmap: {"pgname":"mdbname"},
     }     
   }     
   where schema consists of fields with (already flattened) attributes:
   { "updated at" : {
              "#count":7,
              "#tablename":"foobar",
              "#type":"string",
              "#pgname":"updatedat",
              "#proj":{"$ifNull":["$updated at",null]}
      }, etc.
   }
   output appropriate create foreign table statement and create view statement
   along with pipe and mapfield dictionaries

*/

outputSchema = function(pgschema) {
   for (tablename in pgschema) {
       print("DROP FOREIGN TABLE IF EXISTS " + tablename + " CASCADE;");
       pgpairs="";
       tableschema=pgschema[tablename];
       for (field in tableschema) {


          pgschema=pgschema + field + " " + tableschema[field]["#type"]
       }
       print("CREATE FOREIGN TABLE " + tablename + " ( ", pgpairs, " ) ");
       print("     SERVER mongodb_srv OPTIONS(db '" + pgschema[tablename]["dbname"] + "', collection '" + coll + "'");
       print(", pipe '", pgpipe, "'");
       print(");" );
   
       print("-- view can be edited to transform field names further ");
       print("CREATE VIEW " + tablename + "_view AS SELECT ");
       // print(viewString);
       print(" * ");
       print(" FROM " + tablename + ";");
       print("");
       pgpipe="";
        

   }
}
