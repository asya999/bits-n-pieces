/* given agg expression, create a token "stack" */
load('./instruction.js');
/* first key is last operation */
/* if keyname "$multiply" then value "*", type IOP2, etc */
var unaryOp = {
    "$sqrt" : "sqrt",
    "$ln": "ln",
    "$log10": "log10",
    "$abs": "abs",
    "$ceil": "ceil",
    "$floor": "floor",
    "$trunc": "trunc",
    "$exp": "exp",
    "$not": "not",
    "$strLenCP": "length"
  };

var  binaryOp = {
    "$add": '+',
    "$subtract": '-',
    "$multiply": '*',
    "$divide": '/',
    "$mod": '%',
    "$pow": '^',
    "$concat": '||',
    "$eq": '==',
    "$ne": '!=',
    "$gt": '>',
    "$lt": '<',
    "$gte": '>=',
    "$lte": '<=',
    "$and": 'and',
    "$or": 'or',
  };

var  ternaryOp = {
    "$cond": "?"
  };

var funcs = {
    "$concat": 'concat',
    "$min": 'min',
    "$max": 'max'
  };

DEBUG=false;
function debug(str) {
    if (DEBUG) print(str);
}
function aggToTokens(agg) {

    var nstack = [];

    function agg2tokens(agg) {
        debug("Debug: in agg, have " + tojsononeline(agg));
        if (typeof agg != "object") {
            tok = {type: INUMBER, value: agg};
            nstack.push(tok);
            return;
        } else for (var f1 in agg) {
            debug('have ' + f1);
            if (f1 in unaryOp) {
                debug('have unary ' + f1);
                if (agg[f1].hasOwnProperty("length")) agg2tokens(agg[f1][0]);
                else agg2tokens(agg[f1]);
                nstack.push({type: IOP1, value: unaryOp[f1]});
            }
            else if (f1 in binaryOp) {
                debug('have binary ' + f1);
                if (agg[f1].length != 2) throw new Error('must have two arguments for binary op');
                debug(' with two arguments ' + tojsononeline(agg[f1][0]) + " and " + tojsononeline(agg[f1][1]));
                agg2tokens(agg[f1][0]);
                agg2tokens(agg[f1][1]);
                nstack.push({ type:IOP2, value: binaryOp[f1]});
            }
            else if (f1 in ternaryOp) {
                debug('have ternary ' + f1);
            } else if (f1 in funcs) {
                debug('have function ' + f1);
                nstack.push({type:IVAR, value: funcs[f1]});
                var args = agg[f1];
                for (i=0; i<args.length; i++) {
                    agg2tokens(args[i]);
                }
                nstack.push({ type: IFUNCALL, value: args.length});
            }
            else throw new Error('not an operation ' + f1);
        }
    }
    agg2tokens(agg);
    return nstack;
}
