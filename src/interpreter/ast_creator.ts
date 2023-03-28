export class ASTCreator {
  static value(value: any): any {
    switch (typeof value) {
      default:
        return {
          type: 'Literal',
          value: value
        }
    }
  }

  static binaryExpression(operator: string, left: any, right: any): any {
    return {
      type: 'BinaryExpression',
      operator: operator,
      left: left,
      right: right,
    }
  }
}
