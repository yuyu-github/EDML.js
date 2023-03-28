import EDMLError from '../edml_error.js';
import * as parser from './parser.js';

export default class Parser {
  parse(program: string): any {
    try {
      return parser.parse(program)
    } catch (e) {
      if (e instanceof parser.SyntaxError || e instanceof SyntaxError) {
        throw new EDMLError({
          name: 'SyntaxError',
          message: (e as Error).message
        })
      } else throw e;
    }
  }
}
