'use strict'

const isOperator = x => x === '==='
  || x === '>'
  || x === '<'
  || x === '=='
  || x === '!='
  || x === '!=='
  || x === '>='
  || x === '<='

const invertOperator = operator =>
  operator === '===' ? '!=='
    : operator === '!==' ? '==='
    : operator === '>' ? '<='
    : operator === '<' ? '>='
    : operator === '>=' ? '<'
    : operator === '<=' ? '>'
    : operator === '==' ? '!='
    : operator === '!=' ? '=='
    : operator === '$nin' ? '$in'
    : operator === '$in' ? '$nin'
    : undefined

const andPatch = (and, operator, val) => {
  if ((operator === '===' || operator === '==') && (and['==='] || and['=='] || and['!=='] || and['!='] || and['$nin'])) {
    // if you have equals first, nothing matters later
    delete and['===']
    delete and['==']
    delete and['!==']
    delete and['!=']
    delete and['$nin']
    and[operator] = val
  } else if ((operator === '!==' || operator === '!=') && (and['==='] || and['=='])) {
    // if you have equals later, you can ignore previous non-equals
    // unless they are checking for same value
    if ((operator === '!==' || operator === '!=') === (and['==='] || and['=='])) {
      delete and['===']
      delete and['==']
      and[operator] = val
    } else {
      // pass
    }
  } else if (operator === '$nin' && (and['==='] || and['=='])) {
    // if you have equals later, you can ignore previous nins
    // unless they are checking for same value
    if (~val.indexOf(and['==='] || and['=='])) {
      delete and['===']
      delete and['==']
      and[operator] = val
    } else {
      // pass
    }
  } else if ((operator === '!==' || operator === '!=' || operator === '$nin') && (and['!=='] || and['!='])) {
    // if you have more than one non-equals, you need to merge
    and['$nin'] = [and['!=='] || and['!=']].concat(val)
    delete and['!==']
    delete and['!=']
  } else if ((operator === '!==' || operator === '!=') && and['$nin']) {
    // if you have already merged non equals, add to that
    and['$nin'].push(val)
  } else {
    and[operator] = val
  }
}

const orPatch = or => {
  const block = {}
  var inverted

  // (a || b) === !(!a && !b)
  var i = or.length
  while(i--) {
    inverted = {}
    invert(or[i], inverted)
    andPatchTo(block, inverted)
  }

  inverted = {}
  invert(block, inverted)
  return inverted
}

const andPatchTo = (andTo, andFrom) => {
  for (var key in andFrom) {
    if (key === '$or') {
      if (!andTo.$or) {
        andTo.$or = andFrom.$or
      } else {
        var or = andTo.$or.concat(andFrom.$or)
        delete andTo.$or
        andPatchTo(andTo, orPatch(or))
      }
    } else if (!andTo[key]) {
      andTo[key] = {}
    }
    for (var operator in andFrom[key]) {
      andPatch(andTo[key], operator, andFrom[key][operator])
    }
  }
}

const invertComparison = (comparison, inverted) => {
  for (var operator in comparison) {
    andPatch(inverted, invertOperator(operator), comparison[operator])
    return inverted
  }
}

const invert = (test, inverted) => {
  var or = []

  for (var key in test) {
    if (key !== '$or') {
      const and = {}
      or.push({ [key]: invertComparison(test[key], and) })
    }
  }

  if (test.$or) {
    const and = {}
    var i = test.$or.length
    while(i--) {
      invert(test.$or[i], and)
    }
    or.push(and)
  }

  if (or.length > 1) {
    inverted.$or = or
  } else {
    andPatchTo(inverted, or[0])
  }
}

const parseAnd = (test, resolved, left) => {
  for (var key in test) {
    if (isOperator(key)) {
      if (!resolved[left]) {
        resolved[left] = {}
      }
      andPatch(resolved[left], key, test[key])
    } else {
      parseTest(test[key], resolved, key)
    }
  }
}

const parseTest = (test, resolved, left) => {
  var i = test.length

  if (i > 1) {
    var or = []
    while (i--) {
      const and = {}
      parseAnd(test[i], and, left)
      or.push(and)
    }

    andPatchTo(resolved, orPatch(or))
  } else {
    parseAnd(test[0], resolved, left)
  }
}

const parseUA = (ua, list = [], preCondition, passDown) => {
  if (ua.test) {
    const test = {}
    parseTest(ua.test, test)

    const inverted = {}
    invert(test, inverted)

    andPatchTo(test, preCondition)

    const conditional = Object.keys(ua).filter(k => k !== 'test' && k !== 'alternate')

    if (conditional.length) {
      parseUA(ua[conditional[0]], list, test)
    } else {
      list.push(test)
    }

    andPatchTo(preCondition, inverted)

    if (ua.alternate && Object.keys(ua.alternate).length) {
      parseUA(ua.alternate, list, preCondition, true)
    } else {
      list.push(preCondition)
    }
  } else {
    for (var k in ua) {
      parseUA(ua[k], list, passDown ? preCondition : {})
    }
  }

  return list
}

module.exports = ua => {
  const list = []
  parseUA(ua, list, {})
  return list
}
