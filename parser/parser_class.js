import EDMLError from '../edml_error.js';
import * as parser from './parser.js';

export default class Parser {
  parse(program) {
    try {
      return parser.parse(program)
    } catch (e) {
      if (e instanceof parser.SyntaxError || e instanceof SyntaxError) {
        throw new EDMLError({
          name: 'SyntaxError',
          message: e.message
        })
      } else throw e;
    }
  }
}
