import { defaultSymbol, getType, toPrimitive, toString } from "./func.js";

export const primitiveProperties = {
  string: {
    length: _this => _this.length,
    at: _this => index => ({ value: _this.at(index) }),
    contains: _this => str => ({ value: _this.includes(str) }),
    indexOf: _this => str => ({ value: _this.indexOf(str) }),
    lastIndexOf: _this => str => ({ value: _this.lastIndexOf(str) }),
    padStart: _this => (length, str = ' ') => ({ value: _this.padStart(length, str) }),
    padEnd: _this => (length, str = ' ') => ({ value: _this.padEnd(length, str) }),
    replace: _this => (old, _new) => ({ value: _this.replaceAll(old, _new) }),
    slice: _this => (start, end = _this.length) => ({ value: _this.slice(start, end) }),
    split: _this => (sep = ',') => ({ value: _this.split(sep) }),
    startsWith: _this => str => ({ value: _this.startsWith(str) }),
    endsWith: _this => str => ({ value: _this.endsWith(str) }),
    toUpperCase: _this => () => ({ value: _this.toUpperCase() }),
    toLowerCase: _this => () => ({ value: _this.toLowerCase() }),
    trim: _this => () => ({ value: _this.trim() }),
    trimStart: _this => () => ({ value: _this.trimStart() }),
    trimEnd: _this => () => ({ value: _this.trimEnd() }),
  },
  array: {
    length: _this => _this.length,
    at: _this => index => ({ value: _this.at(index) }),
    contains: _this => value => ({ value: _this.includes(value) }),
    indexOf: _this => value => ({ value: _this.indexOf(value) }),
    lastIndexOf: _this => value => ({ value: _this.lastIndexOf(value) }),
    slice: _this => (start, end = _this.length) => ({ value: _this.slice(start, end) }),
    join: _this => (sep = ',') => ({ value: _this.join(sep) }),
    fill: _this => value => ({ value: _this.fill(value) }),
    add: (_this) => value => { _this.push(value); return { value: _this, set: true } },
    insert: _this => (index, value) => { _this.splice(index, 0, value); return { value: _this, set: true } },
    remove: _this => value => { if (_this.includes(value)) _this.splice(_this.indexOf(value), 1); return { value: _this, set: true } },
    removeAt: _this => index => { _this.splice(index, 1); return { value: _this, set: true } },
    pop: _this => () => { _this.pop(); return { value: _this, set: true } },
    reverse: _this => value => { _this.reverse(value); return { value: _this, set: true } },
    sort: _this => (func = null) => {
      func ??= (a, b) => { a = toString(a); b = toString(b); return a == b ? 0 : a < b ? -1 : 1 }
      return { value: _this.sort((a, b) => func(a, b)?.valueOf()), set: true }
    },
    forEach: _this => func => { return { value: _this.forEach((e, i, a) => func(e, i, a)) } },
    all: _this => func => { return { value: _this.every((e, i, a) => toPrimitive(func(e, i, a).value)) } },
    any: _this => func => { return { value: _this.some((e, i, a) => toPrimitive(func(e, i, a).value)) } },
    filter: _this => func => { return { value: _this.filter((e, i, a) => toPrimitive(func(e, i, a).value)) } },
    find: _this => func => { return { value: _this.find((e, i, a) => toPrimitive(func(e, i, a).value)) } },
    findLast: _this => func => { return { value: _this.findLast((e, i, a) => toPrimitive(func(e, i, a).value)) } },
    group: _this => func => ({
      value: _this.reduce((obj, e, i, a) => { (obj[toPrimitive(func(e, i, a).value)] ??= []).push(e); return obj }, {})
    }),
    map: _this => func => { return { value: _this.map((e, i, a) => func(e, i, a).value) } },
    reduce: _this => (func, init = undefined) => ({
      value: _this.reduce((p, c, i, a) => p === undefined ? c : func(p, c, i, a).value, init)
    }),
    reduceLast: _this => (func, init = undefined) => ({
      value: _this.reduceRight((p, c, i, a) => p === undefined ? c : func(p, c, i, a).value, init) 
    }),
    min: _this => () => ({ value: _this.reduce((min, i) => i < min ? i : min) }),
    max: _this => () => ({ value: _this.reduce((max, i) => i > max ? i : max) }),
    sum: _this => () => ({ value: _this.reduce((sum, i) => {
      if (Array.isArray(sum)) return sum.concat(i);
      else if (Array.isArray(i)) return [sum].concat(i);
      else return sum + i;
    }) }),
    average: _this => () => ({ value: _this.reduce((sum, i) => sum + i) / _this.length }),
  }
}

export function addPrimitiveProperties(obj) {
  if (obj == null || Object.isFrozen(obj)) return;
  let props = primitiveProperties[getType(obj)];

  if (obj[defaultSymbol] === undefined)
    Object.defineProperty(obj, defaultSymbol, {
      value: {},
      configurable: false,
      enumerable: false
    })
    
  for (let propName in props) {
    let dest = obj;
    if (!(Object.getOwnPropertyDescriptor(obj, propName)?.enumerable ?? true)) dest = obj[defaultSymbol]
    if (Object.getOwnPropertyNames(dest).includes(propName)) return;
    Object.defineProperty(dest, propName, {
      get: () => props[propName](toPrimitive(obj)),
      enumerable: true
    })
  }
}
