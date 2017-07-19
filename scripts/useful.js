convertToDec = function(foo) { return {"$add":[foo,NumberDecimal(0)]}; }

conf={ _id:"asya", "members" : [
		{
			"_id" : 0,
			"host" : "Asyas-MacBook-Pro.local:27011"
		},
		{
			"_id" : 1,
			"host" : "Asyas-MacBook-Pro.local:27022"
		},
		{
			"_id" : 2,
			"host" : "Asyas-MacBook-Pro.local:27033"
		}
]}

rsstatus = function () {
   var st=rs.status();
   for (i=0; i<st.members.length; i++) {
       delete(st.members[i].optime);
       delete(st.members[i].state);
       delete(st.members[i].uptime);
       delete(st.members[i].electionTime);
       delete(st.members[i].lastHeartbeat);
       delete(st.members[i].lastHeartbeatRecv);
       delete(st.members[i].lastHeartbeatMessage);
       delete(st.members[i].optime);
   }
   printjson(st);
}

po2 = function(n) {
   y=Math.floor(Math.log(n)/Math.log(2));
  return Math.pow(2,y+1); 
}

getDate = function(ts) {
    if (ts < 14043901530) return new Date(ts*1000);
    else return new Date(ts);
}

mDate=function (dt) {
     cmin = ""+dt.getUTCMinutes();
     csec = ""+dt.getUTCSeconds();
     cmon = ""+(dt.getUTCMonth()+1);
     cdat = ""+dt.getUTCDate();
     if (cmon.length==1) cmon="0"+cmon;
     if (cdat.length==1) cdat="0"+cdat;
     if (cmin.length==1) cmin="0"+cmin;
     if (csec.length==1) csec="0"+csec;
     return dt.getUTCFullYear() + "-" + cmon + "-" + dt.getUTCDate()+" "+dt.getUTCHours() + ":" + cmin + ":" + csec;
}

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

findcoll = function (str) {
        var dbs=[];
        db.getMongo().getDBs().databases.forEach(function(d) {
             if (d.name.indexOf(str) != -1) dbs.push(d.name);
             db.getSiblingDB(d.name).getCollectionNames().forEach(function(co) {
                 if (co.indexOf(str) != -1) dbs.push(d.name + "." + co);
             });
       });
       return dbs;
}

prompt = function() {
    var state = "local";
    var version = db.version();
    var getMongo = db.getMongo();
    var replPrompt = defaultPrompt();
    if (db.version() < '2.5.5') replPrompt = replSetMemberStatePrompt();
    host=getMongo.host.split(':')[0];
    port=getMongo.host.split(':')[1];
    if (port == undefined) port="27017";
    if (replPrompt == "> ") {
        if (host.slice(-5) == "local") {
            state = "local";
        } else {
            state = host;
        }
    } else {
        state = replPrompt.slice(0,-2);
    }

    return db + "@" + state + ":" + port + "(" + version + ") > ";
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

StopWatch = function() {
    this.startMilliseconds = 0;
    this.elapsedMilliseconds = 0;
}

StopWatch.prototype.start = function() {
    this.startMilliseconds = new Date().getTime();
}

StopWatch.prototype.stop = function() {
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
             print(z + Array((40-z.length)).join(' ') +" \t " + mydb.getCollection(z).count());
             printjson(mydb.getCollection(z).findOne());
       });  
}
