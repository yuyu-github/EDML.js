import fs from "fs";
import EDMLError from "../edml_error.js";
import { Parser } from "../main.js";
import { run as runProgram } from "./run.js";
import { importSymbol, toPrimitive } from "./func.js";

export default class InterPreter {
  constructor(options) {
    let defaultOptions = {
      parser: new Parser,
      fileGetter: path => {
        if (fs.existsSync(path)) {
          return fs.readFileSync(path);
        } else return '';
      },
      compileDate: true,
    }
    this.options = {...defaultOptions, ...options}; 
  }

  run(ast, vars = {}) {
    let result;
    try { result = runProgram(ast, { global: Object.freeze(vars) }); }
    catch (e) {
      console.error(e);
      throw new EDMLError({
        name: 'InternalError',
        message: e.message
      })
    } 
    if (result.command !== undefined) {
      if (result.command.name == 'throw') {
        throw new EDMLError(result.command.exception)
      }
    }
    
    return toPrimitive(result.value, true, { compileDate: this.options.compileDate });
  }

  get(ast, vars = {}, path = []) {
    const importCheck = () => {
      if (data?.[importSymbol] !== undefined) {
        let program = this.options.fileGetter(data[importSymbol].src);
        let importAst = this.options.parser.parse(program);
        data = this.run(importAst, vars);
      }
    }

    let data = this.run(ast, vars);
    importCheck();
    for (let name of path) {
      data = data?.[name];
      importCheck();
    }
    return data;
  }
}
