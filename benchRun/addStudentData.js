for(i=0; i<1000; i++) {
['quiz', 'essay', 'exam'].forEach(function(name) {
var score = Math.floor(Math.random() * 50) + 50;
db.scores.insert({student: i, name: name, score: score}); });
}

