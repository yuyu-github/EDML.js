import { addPrimitiveProperties } from "./primitive_property.js";

export const defaultSymbol = Symbol();
export const importSymbol = Symbol();

export function hasEqualProperty(obj, props) {
  for (let prop in obj) {
    if (props.includes(prop)) props.splice(props.indexOf(prop), 1);
    else return false;
  }
  return props.length == 0;
}

export function toPrimitive(value, deep = true, options = {}) {
  let defaultOptions = {
    compileDate: false,
  }
  options = { ...defaultOptions, ...options }; 

  let newValue = value?.valueOf();
  if (Array.isArray(newValue)) {
    newValue = [];
    for (let item of value) {
      newValue.push(deep ? toPrimitive(item, deep, options) : item);
    }
  } else if (typeof newValue == 'object') {
    newValue = {};
    for (let key in value) {
      newValue[key] = deep ? toPrimitive(value[key], deep, options) : value[key];
    }
    for (let key in value?.[defaultSymbol]) {
      newValue[key] = deep ? toPrimitive(value[key], deep, options) : value[key];
    }

    if (options.compileDate == true && hasEqualProperty(newValue, ['time', 'year', 'month', 'day', 'weekDay', 'hour', 'minute', 'second', 'millisecond', 'utc'])) {
      newValue = toDate(newValue);
    }
  }
  return newValue;
}

export function toEDMLObject(value) {
  if (typeof value != 'object' && value != null) value = Object(value);
  addPrimitiveProperties(value);
  return value;
}

export function truthy(value) {
  return !falsy(value);
}

export function falsy(value) {
  return value?.valueOf() === false || value == null;
}

export function toString(value) {
  if (value instanceof Boolean || typeof value === 'boolean') return value ? Object('true') : Object('false');
  if (value instanceof Number || typeof value === 'number') return new String(value);
  if (value instanceof String || typeof value === 'string') return Object(value);
  if (value === null) return Object('null');
  else return new String();
}

export function toRegex(value) {
  let flags = 'gu';
  try {
    if (typeof(value) == 'object' && 'pattern' in value && 'flags' in value) return new RegExp(value.pattern, value.flags.replace(/[^ims]/g) + flags);
    else return new RegExp(value, flags);
  } catch (e) {
    if (e instanceof SyntaxError) return new RegExp('.^')
    else throw e;
  }
}

export function toDate(value) {
  return new Date(value.time)
}

export function toEDMLDate(value, utc = false) {
  return {
    time: value.getTime(),
    year: utc ? value.getUTCFullYear() : value.getFullYear(),
    month: (utc ? value.getUTCMonth() : value.getMonth()) + 1,
    day: utc ? value.getUTCDate() : value.getDate(),
    weekDay: utc ? value.getUTCDay() : value.getDay(),
    hour: utc ? value.getUTCHours() : value.getHours(),
    minute: utc ? value.getUTCMinutes() : value.getMinutes(),
    second: utc ? value.getUTCSeconds() : value.getSeconds(),
    millisecond: utc ? value.getUTCMilliseconds() : value.getMilliseconds(),
    utc: utc,
  }
}

export function getType(value) {
  if (value instanceof Boolean || typeof value === 'boolean') return 'boolean';
  if (value instanceof Number || typeof value === 'number') return 'number';
  if (value instanceof String || typeof value === 'string') return 'string';
  if (typeof value == 'function') return 'function';
  if (Array.isArray(value)) return 'array';
  return 'object';
}
