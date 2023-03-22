import EDMLError from "./edml_error.js";
import { Parser, InterPreter } from "./main.js";

export default class EDML {
  constructor(program, options) {
    let defaultOptions = {
      parser: new Parser,
      interpreter: new InterPreter,
      cache: true
    }
    this.options = { ...defaultOptions, ...options };

    this.ast = this.options.parser.parse(program);
    this.parser = this.options.parser;
    this.interpreter = this.options.interpreter;
    this.cache = [];

    this.interpreter.options.parser = this.parser;
    if (this.options.cache) {
      let getter = this.interpreter.options.fileGetter;
      this.interpreter.options.fileGetter = path => {
        if (this.cache.includes(path)) return this.cache[path];
        else return this.cache[path] = getter(path);
      }
    };
  }

  run(vars = {}) {
    return this.interpreter.run(this.ast, vars);
  }

  get(vars = {}, path = []) {
    return this.interpreter.get(this.ast, vars);
  }
} 
