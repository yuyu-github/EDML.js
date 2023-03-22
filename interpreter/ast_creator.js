export class ASTCreator {
  static value(value) {
    switch (typeof value) {
      default:
        return {
          type: 'Literal',
          value: value
        }
    }
  }

  static binaryExpression(operator, left, right) {
    return {
      type: 'BinaryExpression',
      operator: operator,
      left: left,
      right: right,
    }
  }
}
