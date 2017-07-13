
JavaScript Expression Evaluator to Aggregation
==============================================

Based almost entirely on [JavaScript Expression Evaluator](https://github.com/silentmatt/expr-eval)

Description
-------------------------------------

Parses and evaluates mathematical expressions. Provides method to convert them to aggregation expression.

See [original project README](https://github.com/silentmatt/expr-eval/blob/master/README.md) for details.

Installation
-------------------------------------

In mongo shell:

    > load('parser.js')

Or 
    mongo parser.js --shell

Basic Usage
-------------------------------------

    > var parser = new Parser();
    > var expr = parser.parse('2 * x + 1');
    > agg1=expr.toAgg()
    > agg1
    { "$add" : [ { "$multiply" : [ 2, "x" ] }, 1 ] }
    > expressionToString(aggToTokens(a1),false)
    ((2 * "x") + 1)

    > formula="100*(50 - min(10, (length('$str1')-length('$str2'))))";
    > var expr = parser.parse(fomula);
    > expr.toAgg()
    {
        "$multiply" : [
            100,
            {
                "$subtract" : [
                    50,
                    {
                        "$min" : [
                            10,
                            {
                                "$subtract" : [
                                    {
                                        "$strLenCP" : [
                                            "$str1"
                                        ]
                                    },
                                    {
                                        "$strLenCP" : [
                                            "$str2"
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
    // and back
    > expressionToString(aggToTokens(e.toAgg()),false)
    (100 * (50 - min(10, ((length "$str1") - (length "$str2")))))

    > var f = "'$field1' + '$field2' * (90 - '$field3')";
    > var e = new Parser.parse(f);
    > e.toString();
    ("$field1" + ("$field2" * (90 - "$field3")))
    > a = e.toAgg();
    {
	    "$add" : [
		    "$field1",
		    {
			    "$multiply" : [
				    "$field2",
				    {
					    "$subtract" : [
						    90,
						    "$field3"
					    ]
				    }
			    ]
		    }
	    ]
    }
    > var e2=new Expression(aggToTokens(a1),new Parser())
    > e2.toString()
    ("$field1" + ("$field2" * (90 - "$field3")))


