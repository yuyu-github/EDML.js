import { importSymbol, toDate, toEDMLDate, toPrimitive, toRegex, toString, truthy } from "./func.js"

const builtin = {
  const: Object.freeze({
    e: Math.E,
    pi: Math.PI,
    epsilon: Number.EPSILON,
    minValue: Number.MIN_SAFE_INTEGER,
    maxValue: Number.MAX_SAFE_INTEGER,
  }),

  import: path => {
    let obj = {};
    Object.defineProperty(obj, importSymbol, {
      value: {
        src: path
      },
      enumerable: false
    })
    return { value: obj }
  },

  boolean: value => ({ value: truthy(value) }),
  number: (value, radix) => {
    if (radix !== undefined && (radix < 2 || radix > 36 || radix % 1 !== 0)) return {};
    if (typeof value === 'number') return { value: value };
    if (typeof value === 'boolean') return { value: value ? 1 : 0 }
    if (typeof value === 'string') {7
      let numValue = 0;
      if (radix == null) {
        if (value.startsWith('0b')) { radix = 2; value = value.slice(2); }
        else if (value.startsWith('0o')) { radix = 8; value = value.slice(2); }
        else if (value.startsWith('0x')) { radix = 16; value = value.slice(2); }
        else radix = 10;
      }
      let chars = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, radix);
      let digit = value.split('.')[0].length - 1;
      for (let c of value.replace(/\./, '')) {
        c = c.toLowerCase();
        if (!chars.includes(c)) return {};
        numValue += chars.indexOf(c) * radix ** digit--;
      }
      return { value: numValue };
    }
    return {};
  },
  string: value => ({ value: toString(value) }),
  date: (...args) => {
    if (args.length == 1) return { value: toEDMLDate(new Date(args[0])) };
    if (args.length > 7) return {};
    let date = new Date(0, 0);
    if (args.length > 1) date.setFullYear(args[0], args[1] - 1);
    if (args.length > 2) date.setDate(args[2]);
    if (args.length > 3) date.setHours(args[3]);
    if (args.length > 4) date.setMinutes(args[4]);
    if (args.length > 5) date.setSeconds(args[5]);
    if (args.length > 6) date.setMilliseconds(args[6]);
    return { value: toEDMLDate(date) };
  },
  regex: (pattern, flags = '') => ({ value: { pattern: pattern, flags: flags } }),
  error: (name, message) => ({ value: { name: name, message: message } }),
  range: (num1, num2, step) => {
    let start, end, arr = [];
    if (num2 === undefined) { start = 0, end = num1 } 
    else { start = num1, end = num2 }
    if (step === undefined) step = Math.sign(Math.sign(end - start) + 0.5)
    if (typeof start === 'number' && typeof end === 'number' && typeof step === 'number' && !Number.isNaN(step) && step != 0) {
      for (let i = start; Math.sign(end - i) == Math.sign(step); i += step) arr.push(i)
    }
    return { value: arr }
  },

  now: () => ({ value: toEDMLDate(new Date) }),
  utc: (obj, utc = true) => ({ value: toEDMLDate(toDate(obj), utc) }),
  setDate: (obj, y, m = 1, d = 1) => {
    let value = toDate(obj);
    obj.utc ? value.setUTCFullYear(y, m, d) : value.setFullYear(y, m, d);
    return { value: toEDMLDate(value, obj.utc) }
  },
  setTime: (obj, h, m = 0, s = 0, ms = 0) => {
    let value = toDate(obj);
    obj.utc ? value.setUTCHours(h, m, s, ms) : value.setHours(h, m, s, ms);
    return { value: toEDMLDate(value, obj.utc) }
  },
  setYear: (obj, y) => { let value = toDate(obj); obj.utc ? value.setUTCFullYear(y) : value.setFullYear(y); return { value: toEDMLDate(value, obj.utc) } },
  setMonth: (obj, m) => { let value = toDate(obj); obj.utc ? value.setUTCMonth(m - 1) : value.setMonth(m - 1); return { value: toEDMLDate(value) } },
  setDay: (obj, d) => { let value = toDate(obj); obj.utc ? value.setUTCDate(d) : value.setDate(d); return { value: toEDMLDate(value, obj.utc) } },
  setHour: (obj, h) => { let value = toDate(obj); obj.utc ? value.setUTCHours(h) : value.setHours(h); return { value: toEDMLDate(value, obj.utc) } },
  setMinute: (obj, m) => { let value = toDate(obj); obj.utc ? value.setUTCMinutes(m) : value.setMinutes(m); return { value: toEDMLDate(value, obj.utc) } },
  setSecond: (obj, s) => { let value = toDate(obj); obj.utc ? value.setUTCSeconds(s) : value.setSeconds(s); return { value: toEDMLDate(value, obj.utc) } },
  setMillisecond: (obj, ms) => { let value = toDate(obj); obj.utc ? value.setUTCMilliseconds(ms) : value.setMilliseconds(ms); return { value: toEDMLDate(value, obj.utc) } },
  addDateTime: (obj, y, mo = 0, d = 0, h = 0, mi = 0, s = 0, ms = 0) => {
    let value = toDate(obj);
    y += obj.year; mo += obj.month; d += obj.day; h += obj.hour; mi += obj.minute; s += obj.second; ms += obj.millisecond;
    obj.utc ? value.setUTCFullYear(y, mo, d) : value.setFullYear(y, mo, d);
    obj.utc ? value.setUTCHours(h, mi, s, ms) : value.setHours(h, mi, s, ms);
    return { value: toEDMLDate(value, obj.utc) }
  },
  addDate: (obj, y, m = 0, d = 0) => {
    let value = toDate(obj);
    y += obj.year; m += obj.month; d += obj.day;
    obj.utc ? value.setUTCFullYear(y, m, d) : value.setFullYear(y, m, d);
    return { value: toEDMLDate(value, obj.utc) }
  },
  addTime: (obj, h, m = 0, s = 0, ms = 0) => {
    let value = toDate(obj);
    h += obj.hour; m += obj.minute; s += obj.second; ms += obj.millisecond;
    obj.utc ? value.setUTCHours(h, m, s, ms) : value.setHours(h, m, s, ms);
    return { value: toEDMLDate(value, obj.utc) }
  },
  addYear: (obj, y) => { let value = toDate(obj); y += obj.year; obj.utc ? value.setUTCFullYear(y) : value.setFullYear(y); return { value: toEDMLDate(value, obj.utc) } },
  addMonth: (obj, m) => { let value = toDate(obj); m += obj.month; obj.utc ? value.setUTCMonth(m - 1) : value.setMonth(m - 1); return { value: toEDMLDate(value) } },
  addDay: (obj, d) => { let value = toDate(obj); d += obj.day; obj.utc ? value.setUTCDate(d) : value.setDate(d); return { value: toEDMLDate(value, obj.utc) } },
  addHour: (obj, h) => { let value = toDate(obj); h += obj.hour; obj.utc ? value.setUTCHours(h) : value.setHours(h); return { value: toEDMLDate(value, obj.utc) } },
  addMinute: (obj, m) => { let value = toDate(obj); m += obj.minute; obj.utc ? value.setUTCMinutes(m) : value.setMinutes(m); return { value: toEDMLDate(value, obj.utc) } },
  addSecond: (obj, s) => { let value = toDate(obj); s += obj.second; obj.utc ? value.setUTCSeconds(s) : value.setSeconds(s); return { value: toEDMLDate(value, obj.utc) } },
  addMillisecond: (obj, ms) => { let value = toDate(obj); ms += obj.millisecond; obj.utc ? value.setUTCMilliseconds(ms) : value.setMilliseconds(ms); return { value: toEDMLDate(value, obj.utc) } },
  formatDate: (obj, format) => {
    obj = toDate(obj);
    let zone = -obj.getTimezoneOffset();
    let formatSpecifiers = {
      'g': obj.getFullYear() > 0 ? 'A.D.' : 'B.C.',
      'y': (obj.getFullYear() % 100).toString(),
      'yy': (obj.getFullYear() % 100).toString().padStart(2, '0'),
      'yyy': obj.getFullYear().toString().padStart(3, '0'),
      'yyyy': obj.getFullYear().toString().padStart(4, '0'),
      'yyyyy': obj.getFullYear().toString().padStart(5, '0'),
      'M': (obj.getMonth() + 1).toString(),
      'MM': (obj.getMonth() + 1).toString().padStart(2, '0'),
      'd': obj.getDate().toString(),
      'dd': obj.getDate().toString().padStart(2, '0'),
      'a': obj.getHours() < 12 ? 'AM' : 'PM',
      'h': (obj.getHours() % 12).toString(),
      'hh': (obj.getHours() % 12).toString().padStart(2, '0'),
      'H': obj.getHours().toString(),
      'HH': obj.getHours().toString().padStart(2, '0'),
      'm': obj.getMinutes().toString(),
      'mm': obj.getMinutes().toString().padStart(2, '0'),
      's': obj.getSeconds().toString(),
      'ss': obj.getSeconds().toString().padStart(2, '0'),
      'S': obj.getMilliseconds().toString().padStart(4, '0')[0],
      'SS': obj.getMilliseconds().toString().padStart(4, '0').slice(0, 2),
      'SSS': obj.getMilliseconds().toString().padStart(4, '0').slice(0, 3),
      'SSSS': obj.getMilliseconds().toString().padStart(4, '0'),
      'k': zone === 0 ? 'Z' :
        (Math.sign(zone) === 1 ? '+' : '-') + Math.floor(Math.abs(zone) / 60).toString().padStart(2, '0') +
        ':' + (Math.abs(zone) % 60).toString().padStart(2, '0'),
      'z': (Math.sign(zone) >= 0 ? '+' : '-') + Math.floor(Math.abs(zone) / 60).toString(),
      'zz': (Math.sign(zone) >= 0 ? '+' : '-') + Math.floor(Math.abs(zone) / 60).toString().padStart(2, '0'),
      'Z': (Math.sign(zone) >= 1 ? '+' : '-') + Math.floor(Math.abs(zone) / 60).toString().padStart(2, '0') +
        ':' + (Math.abs(zone) % 60).toString().padStart(2, '0'),
    }

    let result = '';
    while (format.length > 0) {
      let previous = format;
      format = format.replace(/^"(\\"|[^"])*"|'(\\'|[^'])*'/, match => {
        result += match.slice(1, -1);
        return '';
      })
      format = format.replace(/^[^a-zA-Z'"]+/, match => {
        result += match;
        return '';
      })
      format = format.replace(/[a-zA-Z]+/, match => {
        for (let i = match.length; i > 0; i--) {
          if (match.slice(0, i) in formatSpecifiers) {
            result += formatSpecifiers[match.slice(0, i)];
            return match.slice(i);
          }
        }
        return '';
      })
      if (format == previous) break;
    }
    return { value: result }
  },

  match: (reg, str) => ({ value: str.match(toRegex(reg)) ?? [] }),
  matchGroup: (reg, str) => {
    return { value: [...str.matchAll(toRegex(reg))].map(i => ({ ...[...i], ...i.groups })) }
  },
  test: (reg, str) => ({ value: toRegex(reg).test(str) }),
  search: (reg, str) => ({ value: str.search(toRegex(reg)) }),
  replace: (reg, str, newStr) => ({
    value: str.replace(toRegex(reg), typeof newStr == 'function' ? (...args) => toPrimitive(newStr(...args).value) : newStr)
  }),
  split: (reg, str) => ({ value: str.split(toRegex(reg)) }),

  abs: n => ({ value: Math.abs(n) }),
  acos: n => ({ value: Math.acos(n) }),
  acosh: n => ({ value: Math.acosh(n) }),
  asin: n => ({ value: Math.asin(n) }),
  asinh: n => ({ value: Math.asinh(n) }),
  atan: n => ({ value: Math.atan(n) }),
  atanh: n => ({ value: Math.atanh(n) }),
  atan2: n => ({ value: Math.atan2(n) }),
  cbrt: n => ({ value: Math.cbrt(n) }),
  ceil: n => ({ value: Math.ceil(n) }),
  cos: n => ({ value: Math.cos(n) }),
  cosh: n => ({ value: Math.cosh(n) }),
  exp: n => ({ value: Math.exp(n) }),
  floor: n => ({ value: Math.floor(n) }),
  hypot: (...n) => ({ value: Math.hypot(...n) }),
  log: n => ({ value: Math.log(n) }),
  log10: n => ({ value: Math.log10(n) }),
  log2: n => ({ value: Math.log2(n) }),
  random: () => ({ value: Math.random() }),
  round: n => ({ value: Math.round(n) }),
  sign: n => ({ value: Math.sign(n) }),
  sin: n => ({ value: Math.sin(n) }),
  sinh: n => ({ value: Math.sinh(n) }),
  sqrt: n => ({ value: Math.sqrt(n) }),
  tan: n => ({ value: Math.tan(n) }),
  tanh: n => ({ value: Math.tanh(n) }),
  trunc: n => ({ value: Math.trunc(n) }),

  print: obj => { console.log(obj); return {} },
  printTable: obj => { console.table(obj); return {} },
}

export default Object.freeze(builtin)
