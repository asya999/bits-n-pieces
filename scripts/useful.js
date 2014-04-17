shortDate = function (dt) {
    return dt.getFullYear()+"/"+(dt.getMonth()+1)+"/"+dt.getDate()+" "+dt.getHours()+":"+dt.getMinutes()+":"+dt.getSeconds();
}

finddb = function (str) { 
       var dbs=[]; 
       db.getMongo().getDBs().databases.forEach(function(d) { 
            if (d.name.indexOf(str) != -1) dbs.push(d.name); 
       }); 
       return dbs; 
}

prompt = function() {
    var state = "local";
    var version = db.version();
    var host = hostname();
    var replPrompt = defaultPrompt();
    if (db.version() < '2.5.5') replPrompt = replSetMemberStatePrompt();
    if (replPrompt == "> ") {
        if (host.slice(-5) == "local") {
            state = "local";
        } else {
            state = host;
        }
    } else {
        state = replPrompt.slice(0,-2);
    }

    return db + "@" + state + "(" + version + ") > ";
}

count = function(ns, key) {
   var arr = [];
   group = {};
   dollarkey = "$" + key;
   group["$group"] = {"_id":dollarkey, "sum":{"$sum":1} }
   arr.push(group);
   arr.push({ "$sort": { sum : -1 } });
   return db.runCommand({"aggregate":ns,"pipeline":arr});
}

getLastOplog = function (limit, ns, op) {
   arg={};
   if (ns) arg["ns"]=ns;
   if (op) arg["op"]=op;
   lim=1;
   if (limit && typeof(limit)=="number") lim=limit;
   return db.getSiblingDB("local").oplog.rs.find(arg).sort({$natural:-1}).limit(lim);
}

StopWatch = function()
{
    this.startMilliseconds = 0;
    this.elapsedMilliseconds = 0;
}

StopWatch.prototype.start = function()
{
    this.startMilliseconds = new Date().getTime();
}

StopWatch.prototype.stop = function()
{
    this.elapsedMilliseconds = new Date().getTime() - this.startMilliseconds;
}

printOneAll = function () {     
       if (arguments.length > 0) {
           print("printCollectionStats() has no optional arguments");
           return;     
       }  
       var mydb = db;
       db.getCollectionNames().forEach(function(z) {
             if (z.lastIndexOf("system.",0)===0) return;
             print(z + Array((20-z.length)).join(' ') +" \t " + mydb.getCollection(z).count());
             printjson(mydb.getCollection(z).findOne());
       });  
}
