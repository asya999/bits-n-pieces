db.games.drop();
db.gamescoreView.drop();
db.games.ensureIndex({game:1, score:1})
db.games.ensureIndex({score:1})
db.games.ensureIndex({game:1,user_id:1},{unique:true})
for (i=0; i< 10; i++) {
   var fdate = new Date();
   fdate.setMonth(i%5);
   for (j=0; j<100000; j++) {
      var score=Math.round((Math.random()+j)*10000+i*10);
      var ldate = new Date();
      ldate.setMonth(i%5);
      if (score>400) ldate.setMonth(i%5+1);
      ldate.setDate(j%31);
      ldate.setDate(j%31+Math.round(Math.random()*10));
      if (ldate<fdate) ldate=fdate;
      db.games.insert( {
         game:"game"+i, 
         user_id:"user"+j, 
         firstPlayed: fdate,
         lastPlayed:ldate,
         score: score
      }); 
   }
}

var pipeline=[{$addFields:{"game_score":{game:"$game", score:"$score"}}}]

db.createView("gamescoreView","games", pipeline)

/* naive: gets all scores but then we have to filter out the "wrong" games 
 * this is because the current $lookup only allows joining on a single equality 
 */
db.games.aggregate(
{$sort:{game:1, score:-1}}, 
{$group:{_id:"$game", players:{$sum:1},topScores:{$push:"$score"}}},
{$addFields:{topScores:{$slice:["$topScores",0,5]}}},
{$lookup:{from:"games",localField:"topScores",foreignField:"score",as:"top5players"}},
{$addFields:{top5players:{$filter:{input:"$top5players",cond:{$eq:["$$this.game","$_id"]}}}}})

/* can we do better - filter the right players, *and* keep the top players in order? */
db.games.aggregate(
{$sort:{game:1, score:-1}}, 
{$group:{_id:"$game", players:{$sum:1},topScores:{$push:"$score"}}},
{$addFields:{topScores:{$slice:["$topScores",0,5]}}},
{$lookup:{from:"games",localField:"topScores",foreignField:"score",as:"top5players"}},
{$addFields:{
  topPlayers:{$reduce:{
    input:"$topScores",
    initialValue:[ ],
    in:{$let:{vars:{
        topScore:"$$this",
        topP:{$filter:{input:"$top5players",cond:{$eq:["$$this.game","$_id"]}}}
      },
      in:{$concatArrays:[ 
       "$$value", 
       {$filter:{ 
             input:"$$topP",
             as:"t5",
             cond:{$and:[{eq:["$$t5.game","$_id"]},{$eq:["$$t5.score","$$this"]}]}
       }}
     ]} 
    }}
  }},
}}, {$project:{top5players:0}}).pretty();

/* this constructs a composite lookup key from game and score and looks it up in a view *
 * which is much better!  */
db.games.aggregate(
{$sort:{game:1, score:-1}}, 
{$group:{_id:"$game", players:{$sum:1},topScores:{$push:"$score"}}},
{$addFields:{top5Scores:{$map:{input:{$slice:["$topScores",0,5]},in:{game:"$_id", score:"$$this"}}}}}, 
{$lookup:{from:"gamescoreView", localField:"top5Scores",foreignField:"game_score",as:"topScores"}})

/* but the returned topScores are not in order! */

load("/Users/asya/github/bits-n-pieces/scripts/sortArray.js")

/* add sortArray expression generator */
db.games.aggregate(
{$sort:{game:1, score:-1}}, 
{$group:{_id:"$game", players:{$sum:1},topScores:{$push:"$score"}}},
{$addFields:{topScores:{$map:{input:{$slice:["$topScores",0,5]},in:{game:"$_id", score:"$$this"}}}}}, 
{$lookup:{from:"gamescoreView", localField:"topScores",foreignField:"game_score",as:"topScores"}},
{$addFields:{topScores:sortArray("$topScores", "score") }}).pretty()
