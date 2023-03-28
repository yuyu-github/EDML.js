import { defaultSymbol, truthy, falsy, toString, getType, toPrimitive, toEDMLObject } from "./func.js";
import { ASTCreator as AC } from "./ast_creator.js";
import builtin from "./builtin.js";
import { addPrimitiveProperties } from "./primitive_property.js";

export function run(ast, vars = {}) {
  vars = { global: {}, local: [{}], ...vars };
  let result = _run(ast, vars);
  if (typeof result.value == 'number' && !Number.isFinite(result.value)) result.value = undefined;
  result.value = toEDMLObject(result.value);
  return result;
}
function _run(ast, vars) {
  switch (ast.type) {
    case 'ExpressionStatement': {
      return use(run(ast.expression, vars), () => ({}))
    }
    case 'DeleteStatement': {
      return use(run(ast.operand, vars), operand => {
        let ref = operand.ref;
        if (ref === undefined) return _throw('ReferenceError', 'Invalid operand that cannot be deleted');
        delete ref.parent[ref.name];
        return {};
      })
    }
    case 'ThrowStatement': {
      return use(run(ast.exception, vars), exception => ({
        command: {
          name: 'throw',
          exception: Object(exception.value)
        }
      }))
    }
    case 'BreakStatement': {
      return {
        command: {
          name: 'break',
          level: ast.level
        }
      }
    }
    case 'ContinueStatement': {
      return {
        command: {
          name: 'continue',
          level: ast.level
        }
      }
    }
    case 'ReturnStatement': {
      return use(run(ast.value, vars), value => ({
        command: {
          name: 'return',
          value: Object(value.value)
        }
      }))
    }
    
    case 'AssignmentExpression': {
      return use(run(ast.left, vars), left => {
        let ref = left.ref;
        if (ref === undefined) {
          if (left.name === undefined) return _throw('ReferenceError', 'Invalid left side in assignment')
          else {
            ref = {
              parent: vars.local[vars.local.length - 1],
              name: left.name
            }
          }
        }
        return use(run(ast.right, vars), right => {
          let result = right;
          if (ast.operator != '=') {
            result = run(AC.binaryExpression(ast.operator.slice(0, -1), 
              AC.value(ref.parent[ref.name]),
              AC.value(value)), vars)
          }
          return use(result, result => {
            ref.parent[ref.name] = result.value;
            return { value: result.value }
          })
        })
      })
    }
    case 'ConditionalExpression': {
      return use(run(ast.test, vars), test => {
        if (truthy(test.value)) {
          return use(run(ast.consequent, vars), consequent => ({value: consequent.value}));
        } else {
          return use(run(ast.alternate, vars), alternate => ({ value: alternate.value }));
        }
      })
    }
    c
    case 'LogicalExpression': {
      return use(run(ast.left, vars), left => {
        switch (ast.operator) {
          case '||': if (truthy(left.value)) return { value: left.value }; break;
          case '??': if (left.value !== null) return { value: left.value }; break;
          case '&&': if (falsy(left.value)) return { value: left.value }; break;
        }
        return use(run(ast.right, vars), right => ({ value: right.value }));
      })
    }
    case 'BinaryExpression': {
      return use(run(ast.left, vars), left => {
        return use(run(ast.right, vars), right => {
          let leftValue = left.value?.valueOf();
          let rightValue = right.value?.valueOf();

          if (ast.operator == '+') {
            if (typeof leftValue !== 'number' && typeof leftValue !== 'string' && !Array.isArray(leftValue))
              return _throw('TypeError', 'Left value must be number or string or array');
            if (typeof rightValue !== 'number' && typeof rightValue !== 'string' && !Array.isArray(rightValue))
              return _throw('TypeError', 'Right value must be number or string or array');
          }
          else if (ast.operator == '*') {
            if (typeof leftValue != 'number' && typeof leftValue != 'string') return _throw('TypeError', 'Left value must be number or string')
            if (typeof rightValue != 'number' && typeof rightValue != 'string') return _throw('TypeError', 'Right value must be number or string')
            if (typeof leftValue != 'number' && typeof rightValue != 'number') return _throw('TypeError', 'Either left or right value must be number')
          }
          else if (['<=', '>=', '<', '>'].includes(ast.operator)) {
            if (typeof leftValue != 'number' && typeof leftValue != 'string') return _throw('TypeError', 'Left value must be number or string')
            if (typeof rightValue != 'number' && typeof rightValue != 'string') return _throw('TypeError', 'Right value must be number or string')
            if (typeof leftValue != typeof rightValue) return _throw('TypeError', 'left and right value must be the same type')
          }
          else if (['**', '/', '%', '-', '<<', '>>>', '>>'].includes(ast.operator)) {
            if (typeof leftValue != 'number') return _throw('TypeError', 'Left value must be number')
            if (typeof rightValue != 'number') return _throw('TypeError', 'Right value must be number')
          }
          else if (['&', '^', '|'].includes(ast.operator)) {
            if (typeof leftValue != 'number' && typeof leftValue != 'boolean') return _throw('TypeError', 'Left value must be number or boolean')
            if (typeof rightValue != 'number' && typeof rightValue != 'boolean') return _throw('TypeError', 'Right value must be number or boolean')
          }

          let result;
          switch (ast.operator) {
            case '**': result = leftValue ** rightValue; break;
            case '*': {
              if (typeof leftValue == 'string') result = leftValue.repeat(rightValue);
              else if (typeof rightValue == 'string') result = rightValue.repeat(leftValue);
              else result = leftValue * rightValue;
              break;
            }
            case '/': {
              if (rightValue == 0) return _throw('DivideByZeroError')
              result = leftValue / rightValue;
              break;
            }
            case '%': result = leftValue % rightValue; break;
            case '+': {
              if (Array.isArray(leftValue)) result = leftValue.concat(rightValue);
              else if (Array.isArray(rightValue)) result = [leftValue].concat(rightValue);
              else result = leftValue + rightValue;
              break;
            }
            case '-': result = leftValue - rightValue; break;
            case '<<': result = leftValue << rightValue; break;
            case '>>>': result = leftValue >> rightValue; break;
            case '>>': result = leftValue >>> rightValue; break;
            case '<=': result = leftValue <= rightValue; break;
            case '>=': result = leftValue >= rightValue; break;
            case '<': result = leftValue < rightValue; break;
            case '>': result = leftValue > rightValue; break;
            case 'in': result = toString(left)?.valueOf() in rightValue; break;
            case '==': result = leftValue === rightValue; break;
            case '!=': result = leftValue !== rightValue; break;
            case '&': result = leftValue & rightValue; break;
            case '^': result = leftValue ^ rightValue; break;
            case '|': result = leftValue | rightValue; break;
          }
          return { value: result };
        })
      })
    }
    case 'UnaryExpression': {
      return use(run(ast.operand, vars), operand => {
        let operandValue = operand.value?.valueOf();

        if (['+', '-'].includes(ast.operator)) {
          if (typeof operandValue != 'number') return _throw('TypeError', 'Operand must be number')
        }
        if (ast.operator == '!') {
          if (typeof operandValue != 'boolean') return _throw('TypeError', 'Operand must be boolean')
        }
        if (ast.operator == '~') {
          if (typeof operandValue != 'number' && typeof operandValue != 'boolean') return _throw('TypeError', 'Operand must be number or boolean')
        }

        switch (ast.operator) {
          case '+': operandValue = +operandValue; break;
          case '-': operandValue = -operandValue; break;
          case '!': operandValue = !operandValue; break;
          case '~': operandValue = ~operandValue; break;
        }
        if (Number.isNaN(operandValue)) return _throw('NaN Error')
        return { value: operandValue };
      })
    }
    case 'UpdateExpression': {
      return use(run(ast.operand, vars), operand => {
        let ref = operand.ref;
        let result;
        switch (ast.operator) {
          case '++':
            if (ast.prefix) result = ++ref.parent[ref.name]
            else result = ref.parent[ref.name]++
            break;
          case '--':
            if (ast.prefix) result = --ref.parent[ref.name]
            else result = ref.parent[ref.name]--
            break;
        }
        if (Number.isNaN(result)) return _throw('NaN Error')
        return {value: result};
      })
    }
    case 'MemberExpression': {
      return use(run(ast.object, vars), object => {
        if (object.value == null) return { value: undefined };

        if (object.value[defaultSymbol] === undefined && !Object.isFrozen(object.value))
          Object.defineProperty(object.value, defaultSymbol, {
            value: {},
            enumerable: false
          })

        let property;
        if (ast.computed) {
          let { value, command } = run(ast.property, vars);
          property = toString(value).valueOf();
          if (command !== undefined) return { command: command };
        } 
        else property = ast.property.name;

        if (!Object.getOwnPropertyNames(object.value).includes(property)) {
          if ((Object.getOwnPropertyDescriptor(object.value, property)?.configurable ?? true) && !Object.isFrozen(object.value))
            object.value[property] = undefined;
        }

        let parent = object.value;
        if (!(Object.getOwnPropertyDescriptor(object.value, property)?.enumerable ?? true))
          parent = object.value[defaultSymbol];
        let ref = {}, parentRef = {};
        if ((Object.getOwnPropertyDescriptor(parent, property)?.configurable ?? true) && !Object.isFrozen(parent)) {
          ref = {
            ref: {
              parent: parent,
              name: property
            }
          }
        }
        if (object.ref !== undefined) parentRef = { parentRef: object.ref };
        return {
          value: parent[property],
          ...ref,
          ...parentRef,
        }
      })
    }
    case 'CallExpression': {
      return use(run(ast.callee, vars), callee => {
        if (callee.value == null) return { value: undefined };

        let args = [];
        for (let arg of ast.arguments) {
          let { value, command } = run(arg, vars);
          if (command !== undefined) return { command: command };
          args.push(toPrimitive(value));
        }
        
        return use(callee.value(...args), result => {
          if (result.set === true && callee.parentRef !== undefined) callee.parentRef.parent[callee.parentRef.name] = result.value;
          return { value: result.value }
        })
      })
    }

    case 'SpreadSyntax': {
      return use(run(ast.expression, vars), value => ({ value: value.value }))
    }
    case 'IfExpression': {
      return use(run(ast.test, vars), test => {
        if (truthy(test.value)) {
          return use(run(ast.consequent, vars), consequent => ({ value: consequent.value }));
        } else {
          if (ast.alternate === null) return { value: undefined };
          return use(run(ast.alternate, vars), alternate => ({ value: alternate.value }));
        }
      })
    }
    case 'SwitchExpression': {
      return use(run(ast.expression, vars), expression => {
        for (let _case of ast.cases) {
          let match = false;
          for (let item of _case.test) {
            let caseValue, success, command;
            ({ value: caseValue, command } = run(item, vars));
            if (command !== undefined) return { command: command };
            if (expression.value === caseValue) match = true;
          }
          if (match) return use(run(_case.consequent, vars), result => ({ value: result.value }));
        }
        if (ast.default !== null) {
          return use(run(ast.default, vars), result => ({ value: result.value }))
        }
        return {};
      })
    }
    case 'TryExpression': {
      let result = (() => {
        let { value: result, command } = run(ast.body, vars)
        if (command !== undefined) {
          if (command.name == 'throw' && ast.handler !== null) {
            let param = {};
            if (ast.handler.param != null) param[ast.handler.param.name] = command.exception;
            return scope(vars, () => {
              return use(run(ast.handler.body, vars), result => ({ value: result.value }))
            }, param)
          } else return { command: command };
        }
        return { value: result }
      })();
      if (ast.finalizer !== null) {
        let { command } = run(ast.finalizer, vars);
        if (command !== undefined) result = { command: command, ...result };
      }
      return result;
    }
    case 'ForInExpression': {
      return use(run(ast.iterable, vars), iterable => {
        if (iterable.value instanceof String || Array.isArray(iterable.value)) {
          let result = undefined;
          let i = 0;
          for (let item of iterable.value) {
            let param = {[ast.item.name]: item};
            if (ast.index != null) param[ast.index.name] = i;

            let {value, command} = scope(vars, () => {
              return run(ast.body, vars);
            }, param);
            if (getType(value) == 'object') {
              if (result === undefined) result = {};
              for (let key in value) {
                result[key] = value[key];
              }
              for (let key in value?.[defaultSymbol]) {
                result[key] = value[defaultSymbol][key];
              }
            } else if (Array.isArray(value)) {
              if (result === undefined) result = [];
              for (let item of value) result.push(item);
            } else if (value !== undefined) {
              if (result === undefined) result = [];
              result.push(value);
            }
            if (command !== undefined) {
              if (command.name == 'break') {
                break;
              } else if (command.name == 'continue') {
              } else return { value: result, command: command };
            }

            i++;
          }
          return { value: result };
        }
      })
    }
    case 'WhileExpression':
    case 'DoWhileExpression': {
      let testStart = ast.type == 'WhileExpression';
      let result = undefined;
      while (true) {
        if (testStart) {
          let { value: test, command } = run(ast.test, vars);
          if (command !== undefined) return { value: result, command: command };
          if (falsy(test)) break;
        }

        let { value, command } = run(ast.body, vars);
        if (getType(value) == 'object') {
          if (result === undefined) result = {};
          for (let key in value) {
            result[key] = value[key];
          }
          for (let key in value?.[defaultSymbol]) {
            result[key] = value[defaultSymbol][key];
          }
        } else if (Array.isArray(value)) {
          if (result === undefined) result = [];
          for (let item of value) result.push(item);
        } else if (value !== undefined) {
          if (result === undefined) result = [];
          result.push(value);
        }
        if (command !== undefined) {
          if (command.name == 'break') {
            break;
          } else if (command.name == 'continue') {
          } else return { value: result, command: command };
        }

        if (!testStart) {
          let { value: test, command } = run(ast.test, vars);
          if (command !== undefined) return { value: result, command: command }; 7
          if (falsy(test)) break;
        }
      }
      return { value: result };
    }

    case 'Global': {
      return { value: vars.global }
    }
    case 'Builtin': {
      return { value: builtin }
    }
    case 'Identifier': {
      for (let item of vars.local) {
        if (ast.name in item)
          return {
            value: item[ast.name],
            ref: {
              parent: item,
              name: ast.name
            }
          }
      }
      if (ast.name in vars.global)
        return {
          value: vars.global[ast.name],
          name: ast.name
        }
      else if (ast.name in builtin)
        return {
          value: builtin[ast.name],
          name: ast.name
        }
      else return {
        ref: {
          parent: vars.local[vars.local.length - 1],
          name: ast.name
        }
      }
    }

    case 'Literal': {
      return { value: ast.value };
    }
    case 'FormattedString': {
      let str = '';
      for (let elem of ast.elements) {
        if (elem.type == 'FormattedStringElement') {
          str += elem.value
        } else {
          let { value, command } = run(elem, vars);
          if (command !== undefined) return { command: command };
          str += toString(value);
        }
      }
      return { value: str }
    }
    case 'Array': {
      return scope(vars, () => {
        let array = [];
        for (let elem of ast.elements) {
          let { value, command } = run(elem, vars);
          if (elem.kind == 'Expression') {
            array.push(value);
          } else if (elem.kind == 'SpreadExpression') {
            if (Array.isArray(value)) for (let item of value) array.push(item);
            else if (value !== undefined) array.push(value);
          }
          if (command !== undefined) return { value: array, command: command };
        }
        return { value: array }
      });
    }
    case 'Object': {
      return scope(vars, () => {
        let obj = {};
        for (let elem of ast.elements) {
          if (elem.type == 'KeyValuePair') {
            let key, value, command;
            if (elem.key.type == 'Identifier') key = elem.key.name;
            else {
              ({ value: key, command } = run(elem.key, vars));
              if (command !== undefined) return { value: obj, command: command };
            }
            ({ value, command } = run(elem.value, vars));
            obj[key] = value;
            if (command !== undefined) return { value: obj, command: command };
          } else {
            let { value, command } = run(elem, vars);
            if (elem.kind == 'SpreadExpression') {
              for (let key in value) {
                obj[key] = value[key];
              }
              for (let key in value?.[defaultSymbol]) {
                obj[key] = value[defaultSymbol][key];
              }
            }
            if (command !== undefined) return { value: obj, command: command };
          }
        }
        return { value: obj }
      });
    }
    case 'KeyValuePair': {
      let key, command;
      if (ast.key.type == 'Identifier') key = ast.key.name;
      else {
        ({ value: key, command } = run(ast.key, vars));
        if (command !== undefined) return { command: command };
      }
      return use(run(ast.value, vars), value => ({ value: {[key]: value.value} }))
    }
    case 'LambdaExpression': {
      return { value: (...args) => {
        let argVars = {};
        ast.params.forEach((param, i) => {
          let key;
          if (param.type == 'Identifier') {
            key = param.name;
            argVars[key] = args[i];
          } else if (param.type == 'DefaultParam') {
            key = param.left.name;
            if (args[i] === undefined) {
              let { value, command } = run(param.right, vars);
              if (command !== undefined) return { command: command };
              argVars[key] = value.value;
            } else argVars[key] = args[i];
          }
          argVars[key] = Object(argVars[key]);
          addPrimitiveProperties(argVars[key]);
        })

        return scope(vars, () => {
          let { value: result, command } = run(ast.body, vars)
          if (command !== undefined) {
            if (command.name == 'return') {
              result = command.value;
            } else return { command: command };
          }
          return { value: result }
        }, argVars);
      } }
    }
  }
}

function use(value, func) {
  if (value.command !== undefined) return { command: value.command };
  else return func(value);
}

function scope(vars, func, data = {}) {
  vars.local.push(data);
  let result = func();
  vars.local.pop();
  return result;
}

function _throw(name, message) {
  return {
    command: {
      name: 'throw',
      exception: {
        name: name,
        message: message
      }
    }
  }
}
