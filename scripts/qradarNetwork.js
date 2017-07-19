db.qradar.aggregate([
    {$match:{dt:{$gte:ISODate("2017-05-08T04:00:00Z"),$lt:ISODate("2017-05-08T08:00:00Z")}}}, 
    {$sort:{username:1, dt:1}}, 
    {$group:{_id:"$username", ips:{$push:{ip:"$sourceaddress", dt:"$dt",str:{$substr:["$Time",11,5]}}}}},
    {$addFields:{diffIpNum:{$size:{$setUnion:"$ips.ip"}}}},
    {$match:{diffIpNum:{$gt:1}}},
    {$addFields:{diffs:
        {$map:{
            input: {$range:[0,{$subtract:[{$size:"$ips"},1]}]},
            as:"i", 
            in: {$let: {
                vars: { ips2: {$slice:["$ips","$$i",{$size:"$ips"}]} },
                in: {$map:{
                    input:{$range:[{$add:["$$i",1]},{$size:"$$ips2"}]},
		    as: "i2",
		    in: {$let:{
                       vars:{ip1:{$arrayElemAt:["$$ips2",0]},ip2:{$arrayElemAt:["$$ips2","$$i2"]}},
                       in: {diff:{$cond:[ {$ne:["$$ip1.ip","$$ip2.ip"]}, {$divide:[{$abs:{$subtract:["$$ip1.dt","$$ip2.dt"]}},60000]}, 999999]}
			       ,ips2:"$$ips2",i:"$$i",i2:"$$i2",ip1:"$$ip1",ip2:"$$ip2"}
                    }}
                }}
            }} 
        }}
    }}
,{$limit:5}]).pretty()

db.qradar.aggregate([
    {$match:{dt:{$gte:ISODate("2017-05-08T04:00:00Z"),$lt:ISODate("2017-05-08T08:00:00Z")}}}, 
    {$sort:{username:1, dt:1}}, 
    {$group:{_id:"$username", ips:{$push:{ip:"$sourceaddress", dt:"$dt",str:{$substr:["$Time",11,5]}}}}},
    {$addFields:{diffIpNum:{$size:{$setUnion:"$ips.ip"}}}},
    {$match:{diffIpNum:{$gt:1}}},
    {$addFields:{diffs: {$reduce:{
        input: {$map:{
            input: {$range:[0,{$subtract:[{$size:"$ips"},1]}]},
            as:"i", 
            in: {$filter:{input:{$map:{
                input:{$range:[{$add:["$$i",1]},{$size:"$ips"}]},
	        as: "i2",
                in: {$let: {
                       vars:{ip1:{$arrayElemAt:["$ips","$$i"]},ip2:{$arrayElemAt:["$ips","$$i2"]}},
                       in: {diff:{$cond:[ {$ne:["$$ip1.ip","$$ip2.ip"]}, {$divide:[{$abs:{$subtract:["$$ip1.dt","$$ip2.dt"]}},60000]}, 999999]}
			      ,ip1:"$$ip1.ip",time1:"$$ip1.str",ip2:"$$ip2.ip",time2:"$$ip2.str"}
                }}
            }}, as:"m", cond:{$lt:["$$m.diff",10]}}} 
        }}, 
        initialValue:[], 
        in:{$concatArrays:["$$value","$$this"]}
    }}}},
    {$match:{"diffs.diff":{$lt: 10}}}, {$project:{_id:0, username:"$_id"}},
,{$limit:5}]).pretty()

db.qradar.aggregate([
    {$match:{dt:{$gte:ISODate("2017-05-08T04:00:00Z"),$lt:ISODate("2017-05-08T08:00:00Z")}}}, 
    {$sort:{username:1, dt:1}}, 
    {$group:{_id:"$username", ips:{$push:{ip:"$sourceaddress", dt:"$dt",str:{$substr:["$Time",11,5]}}}}},
    {$addFields:{diffIpNum:{$size:{$setUnion:"$ips.ip"}}}},
    {$match:{diffIpNum:{$gt:1}}},
    {$addFields:{diffs: {$filter:{
        input:{$map:{
            input: {$range:[0,{$subtract:[{$size:"$ips"},1]}]},
            as:"i", 
            in: {$let:{
                vars:{ ip1:{$arrayElemAt:["$ips","$$i"]},
                       ip2:{$arrayElemAt:["$ips",{$add:["$$i",1]}]}
                },
                in: {diff:{$cond:[ {$ne:["$$ip1.ip","$$ip2.ip"]}, {$divide:[{$abs:{$subtract:["$$ip1.dt","$$ip2.dt"]}},60000]}, 999999]},
                     ip1:"$$ip1.ip",
                     time1:"$$ip1.str",
                     ip2:"$$ip2.ip",
                     time2:"$$ip2.str"}
            }} 
        }},
        as:"m", 
        cond:{$lt:["$$m.diff",10]}
    }}}},
    {$match:{"diffs.diff":{$lt: 10}}}, 
    {$project:{_id:0, username:"$_id"}},
]).pretty()

db.qradar.aggregate([
    {$match:{dt:{$gte:ISODate("2017-05-08T04:00:00Z"),$lt:ISODate("2017-05-08T08:00:00Z")}}}, 
    {$sort:{user:1, dt:1}}, 
    {$group:{_id:"$user", ips:{$push:{ip:"$ipaddr", dt:"$dt"}}}},
    {$addFields:{diffIpNum:{$size:{$setUnion:"$ips.ip"}}}},
    {$match:{diffIpNum:{$gt:1}}},
    {$addFields:{diffs: {$filter:{
        input:{$map:{
            input: {$range:[0,{$subtract:[{$size:"$ips"},1]}]},
            as:"i", 
            in: {$let:{
                vars:{ ip1:{$arrayElemAt:["$ips","$$i"]},
                       ip2:{$arrayElemAt:["$ips",{$add:["$$i",1]}]}
                },
                in: {$cond:[ {$ne:["$$ip1.ip","$$ip2.ip"]}, {$divide:[{$abs:{$subtract:["$$ip1.dt","$$ip2.dt"]}},60000]}, 999999]}
            }} 
        }},
        as:"m", 
        cond:{$lt:["$$m",10]}
    }}}},
    {$match:{"diffs":{$lt: 10}}}, 
    {$project:{_id:0, username:"$_id"}},
]).pretty()

db.logins.aggregate([
    {$match:{dt:{$gte:ISODate("2017-05-08T04:00:00Z"),$lt:ISODate("2017-05-08T08:00:00Z")}}}, 
    {$sort:{user:1, dt:1}}, 
    {$group:{_id:"$user", ips:{$push:{ip:"$ipaddr", dt:"$dt"}}}},
    {$addFields:{diffIpNum:{$size:{$setUnion:"$ips.ip"}}}},
    {$match:{diffIpNum:{$gt:1}}},
    {$addFields:{diffs: {$filter:{
        input:{$map:{
            input: {$range:[0,{$subtract:[{$size:"$ips"},1]}]},
            as:"i", 
            in: {$let:{
                vars:{ ip1:{$arrayElemAt:["$ips","$$i"]},
                       ip2:{$arrayElemAt:["$ips",{$add:["$$i",1]}]}
                },
                in: {$cond:[ {$ne:["$$ip1.ip","$$ip2.ip"]}, {$divide:[{$abs:{$subtract:["$$ip1.dt","$$ip2.dt"]}},60000]}, 999999]}
            }} 
        }},
        as:"m", 
        cond:{$lt:["$$m",10]}
    }}}},
    {$match:{"diffs":{$lt: 10}}}, 
    {$project:{_id:0, username:"$_id"}},
]).pretty()

db.logins.aggregate([
    {$match:{dt:{$gte:ISODate("2017-05-08T04:00:00Z"),$lt:ISODate("2017-05-08T08:00:00Z")}}}, 
    {$sort:{user:1, dt:1}}, 
    {$group:{_id:"$user", ips:{$push:{ip:"$ipaddr", dt:"$dt"}}}},
    {$addFields:{diffIpNum:{$size:{$setUnion:"$ips.ip"}}}},
    {$match:{diffIpNum:{$gt:1}}},
    {$addFields:{diffs: {$filter:{
        input:{$map:{
            input: {$range:[0,{$subtract:[{$size:"$ips"},1]}]},
            as:"i", 
            in: {$let:{
                vars:{ ip1:{$arrayElemAt:["$ips","$$i"]},
                       ip2:{$arrayElemAt:["$ips",{$add:["$$i",1]}]}
                },
                in: {diff:{$cond:[ {$ne:["$$ip1.ip","$$ip2.ip"]}, {$divide:[{$abs:{$subtract:["$$ip1.dt","$$ip2.dt"]}},60000]}, 999999]},
                     ip1:"$$ip1.ip",
                     time1:"$$ip1.str",
                     ip2:"$$ip2.ip",
                     time2:"$$ip2.str"}
            }} 
        }},
        cond:{$lt:["$$this.diff",10]}
    }}}},
    {$match:{"diffs":{$ne: []}}}, 
    {$project:{_id:0, user:"$_id", suspectLogins:"$diffs"}},
]).pretty()

arrayOfIndexes = function(arr) {
   return {$range:[0,{$subtract:[{$size:arr},1]}]};
}

db.logins.aggregate([
    {$match:{ts:{$gte:ISODate("2017-05-08T04:00:00Z"),$lt:ISODate("2017-05-08T08:00:00Z")}}}, 
    {$sort:{user:1, ts:1}}, 
    {$group:{_id:"$user", ips:{$push:{ip:"$ipaddr", ts:"$ts"}}}},
    {$addFields:{diffIpNum:{$size:{$setUnion:"$ips.ip"}}}},
    {$match:{diffIpNum:{$gt:1}}},
    {$addFields:{diffs: {$filter:{
        input:{$map:{
            input: {$range:[0,{$subtract:[{$size:"$ips"},1]}]},
            as:"i", 
            in: {$let:{
                vars:{ ip1:{$arrayElemAt:["$ips","$$i"]},
                       ip2:{$arrayElemAt:["$ips",{$add:["$$i",1]}]}
                },
                in: {diff:{$divide:[{$abs:{$subtract:["$$ip1.ts","$$ip2.ts"]}},60000]},
                     ip1:"$$ip1.ip",
                     time1:"$$ip1.str",
                     ip2:"$$ip2.ip",
                     time2:"$$ip2.str"}
            }} 
        }},
        cond:{$and:[{$lt:["$$this.diff",10]},{$ne:["$$this.ip1","$$this.ip2"]}]}
    }}}},
    {$match:{"diffs":{$ne: []}}}, 
    {$project:{_id:0, user:"$_id", suspectLogins:"$diffs"}},
]).pretty()

