_path="/path/to/my/folder";
basepath="folder";
collname="files";
db.getCollection(collname).insert([
    { "_id" : 1, "name" : "", "type" : "folder", "createdAt" : ISODate("2017-05-02T04:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z") },
    { "_id" : 2, "name" : "path", "type" : "folder", "createdAt" : ISODate("2017-02-05T05:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 1 },
    { "_id" : 3, "name" : "to", "type" : "folder", "createdAt" : ISODate("2017-03-01T05:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 2 },
    { "_id" : 4, "name" : "my", "type" : "folder", "createdAt" : ISODate("2017-01-21T05:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 3 },
    { "_id" : 5, "name" : "folder", "type" : "folder", "createdAt" : ISODate("2017-01-21T05:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 4 },
    { "_id" : 6, "name" : "file1.txt", "type" : "file", "createdAt" : ISODate("2017-01-21T05:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 5 },
    { "_id" : 7, "name" : "file2.txt", "type" : "file", "createdAt" : ISODate("2017-01-25T05:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 5 },
    { "_id" : 8, "name" : "file3.txt", "type" : "file", "createdAt" : ISODate("2017-01-25T05:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 5 },
    { "_id" : 9, "name" : "subdir", "type" : "folder", "createdAt" : ISODate("2017-05-02T04:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 5 },
    { "_id" : 10, "name" : "etc", "type" : "folder", "createdAt" : ISODate("2017-05-02T04:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 1 },
    { "_id" : 11, "name" : "usr", "type" : "folder", "createdAt" : ISODate("2017-05-02T04:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 1 },
    { "_id" : 12, "name" : "their", "type" : "folder", "createdAt" : ISODate("2017-05-01T04:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 3 },
    { "_id" : 13, "name" : "folder", "type" : "folder", "createdAt" : ISODate("2017-04-01T04:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 12 },
    { "_id" : 14, "name" : "notmyfiles", "type" : "file", "createdAt" : ISODate("2017-04-01T04:00:00Z"), "updatedAt" : ISODate("2017-05-25T19:07:19.240Z"), "parentId" : 13 }
]);
db.getCollection(collname).aggregate([
    {$match:{type:"folder",name: basepath}},
    {$graphLookup:{
        from:collname,
        startWith:"$parentId",
        connectFromField:"parentId",
        connectToField:"_id",
        as:"paths",
        restrictSearchWithMatch:{
            type:"folder",
            parentId:{$ne:null}
        },
        depthField:"d"
    }},
    {$addFields:{
        ordered:{$map:{
            input:{$range:[0, {$size:"$paths"}]},
            as:"i",       
            in:{ $arrayElemAt:[
                {$filter:{input:"$paths",cond:{$eq:["$$this.d","$$i"]}}},
                0 
            ]}
        }}
    }},
    {$addFields:{
        path:{$concat:[
            "/",
            {$reduce:{
                input:"$ordered.name",
                initialValue:"",
                in:{$concat:["$$this","/","$$value"]}}},
            basepath
        ]}
    }}, 
    {$project:{paths:0, ordered:0}},
    {$match:{path:_path}}, 
    {$lookup:{
        from:collname,
        localField:"_id",
        foreignField:"parentId",
        as:"allFiles" 
    }} 
])
