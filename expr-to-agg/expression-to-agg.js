function expressionToAgg(tokens) {
  var nstack = [];
  var n1, n2, n3;
  var f;
  for (var i = 0; i < tokens.length; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER) {
        nstack.push(item.value);
    } else if (type === IOP2) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (f === '^') {
          nstack.push({'$pow':[ n1 ,n2 ]});
      } else if (f === '>') {
           nstack.push({'$gt':[ n1 ,n2 ]});
      } else if (f === '>=') {
           nstack.push({'$gte':[ n1 ,n2 ]});
      } else if (f === '<') {
           nstack.push({'$lt':[ n1 ,n2 ]});
      } else if (f === '<=') {
           nstack.push({'$lte':[ n1 ,n2 ]});
      } else if (f === '==') {
           nstack.push({'$eq':[ n1 ,n2 ]});
      } else if (f === '!=') {
           nstack.push({'$ne':[ n1 ,n2 ]});
      } else if (f === '%') {
           nstack.push({'$mod':[ n1 ,n2 ]});
      } else if (f === '/') {
           nstack.push({'$divide':[ n1 ,n2 ]});
      } else if (f === '*') {
           nstack.push({'$multiply':[ n1 ,n2 ]});
      } else if (f === '+') {
           nstack.push({'$add':[ n1 ,n2 ]});
      } else if (f === '-') {
           nstack.push({'$subtract':[ n1 ,n2 ]});
      } else if (f === '||') {
           nstack.push({'$or':[ n1 ,n2 ]});
      } else if (f === '&&') {
           nstack.push({'$and':[ n1 ,n2 ]});
      } else {
           throw new Error('invalid binary op ' + f);
      }
    } else if (type === IOP3) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (f === '?') {
        nstack.push({'$cond':[ n1, n2, n3 ]});
      } else {
        throw new Error('invalid Expression');
      }
    } else if (type === IOP1) {
      n1 = nstack.pop();
      f = item.value;
      if (f === 'abs') {
          nstack.push({'$abs':[n1]});
      } else if (f === 'floor') {
          nstack.push({'$floor':[n1]});
      } else if (f === 'ceil') {
          nstack.push({'$ceil':[n1]});
      } else if (f === '-') {
          nstack.push({'$subtract':[0, n1]});
      } else if (f === 'not') {
          nstack.push({$not: [n1] });
      } else if (f === 'length') {
          nstack.push({$strLenCP: [n1] });
      } else {
          throw new Error('unsupported unary op');
      }
    } else if (type === IVAR) {
        nstack.push(item.value);
    } else if (type === IMEMBER) {
        // if this is Math.min then we want to toss Math and leave min
        n1 = nstack.pop();
        nstack.push(item.value);
    } else if (type === IFUNCALL) {
        var argCount = item.value;
        var args = [];
        while (argCount-- > 0) {
            args.unshift(nstack.pop());
        }
        f = nstack.pop();
        if (f === 'min') {
            nstack.push({'$min':  args});
        } else if (f === 'max') {
            nstack.push({'$max':  args});
        } else if (f === 'concat') {
            nstack.push({'$concat':  args});
        } else throw new Error('unknown function ' + f);
    } else if (type === IMEMBER) {
      n1 = nstack.pop();
      nstack.push(n1 + '.' + item.value);
    } else if (type === IEXPR) {
      nstack.push('(' + expressionToAgg(item.value) + ')');
    } else {
      throw new Error('Unknown Expression');
    }
  }
  if (nstack.length > 1) {
    throw new Error('invalid Expression (parity)');
  }
  return nstack[0];
}
