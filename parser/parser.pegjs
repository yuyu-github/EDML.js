{{
  const reservedWords = ["if", "else", "switch", "case", "default", "try", "catch", "for", "in", "while", "do", "delete", "break", "continue", "return", "throw", "require", "global", "builtin", "true", "false", "null"]
  const escapeSequences = {"n":"\n", "r":"\r", "t":"\t"}
}}


Start = _ @(Statement / Expression) _


Statement = statement:(ExpressionStatement / DeleteStatement / BreakStatement / ContinueStatement / ReturnStatement / ThrowStatement) _ ";"
{ return {kind: "Statement", ...statement} }

ExpressionStatement = expression:Expression { return {type:"ExpressionStatement", expression: expression} }

DeleteStatement = "delete" __ operand:Factor { return {type: "DeleteStatement", operand: operand} }
ThrowStatement = "throw" __ exception:Expression { return {type: "ThrowStatement", exception: exception} }

BreakStatement = "break" level:(__ @([1-9][0-9]* { return parseInt(text()) }))? { return {type: "BreakStatement", level: level} }
ContinueStatement = "continue" level:(__ @([1-9][0-9]* { return parseInt(text()) }))? { return {type: "ContinueStatement", level: level} }
ReturnStatement = "return" value:(__ @Expression)? { return {type: "ReturnStatement", value: value} }


Expression = expression:AssignmentExpression
{ return {kind: "Expression", ...expression} }

AssignmentExpression = left:Factor _ operator:$(("**" / "<<" / ">>>" / ">>" / "&&" / "||" / "??" / [+\-*/%&^|])? "=") _ right:AssignmentExpression
{ return {type: "AssignmentExpression", operator: operator, left: left, right: right} } / ConditionalExpression

ConditionalExpression = test:LogicalExpression _ "?" _ consequent:LogicalExpression _ ":" _ alternate:Expression
{ return {type: "ConditionalExpression", test: test, consequent: consequent, alternate: alternate} } / LogicalExpression

LogicalExpression = head:LogicalTerm tail:(_ ("||" / "??") _ right:LogicalTerm)*
{ return tail.reduce((res, i) => ({type: "LogicalExpression", operator: i[1], left:res, right:i[3]}), head)}
LogicalTerm = head:BitwiseExpression tail:(_ "&&" _ BitwiseExpression)*
{ return tail.reduce((res, i) => ({type: "LogicalExpression", operator: i[1], left:res, right:i[3]}), head)}

BitwiseExpression = head:ExclusiveOr tail:(_ "|" _ ExclusiveOr)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}
ExclusiveOr = head:BitwiseTerm tail:(_ "^" _ BitwiseTerm)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}
BitwiseTerm = head:Equals tail:(_ "&" _ Equals)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}

Equals = head:ComparisonExpression tail:(_ ("==" / "!=") _ ComparisonExpression)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}
ComparisonExpression = head:BitShift tail:(_ ("<=" / ">="/ "in" / [<>]) _ BitShift)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}

BitShift = head:Polynomial tail:(_ ("<<" / ">>>" / ">>") _ Polynomial)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}

Polynomial = head:Term tail:(_ [+\-] _ Term)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}
Term = head:Pow _ tail:(_ [*/%] _ Pow)*
{ return tail.reduce((res, i) => ({type: "BinaryExpression", operator: i[1], left:res, right:i[3]}), head)}
Pow = left:UnaryExpression _ operator:"**" _ right:Pow
{ return {type: "BinaryExpression", operator: operator, left:left, right:right} } / UnaryExpression

UnaryExpression = PrefixUpdateExpression / operator:[+\-!~] _ operand:UnaryExpression
{ return {type: "UnaryExpression", operator: operator, operand: operand, prefix: true} } / PostfixUpdateExpression
PrefixUpdateExpression = operator:("++" / "--") _ operand:(MemberExpression / Identifier)
{ return {type: "UpdateExpression", operator: operator, operand: operand, prefix: true} }

PostfixUpdateExpression = operand:(MemberExpression / Identifier) _ operator:("++" / "--")
{ return {type: "UpdateExpression", operator: operator, operand: operand, prefix: false} } / Factor

Factor = head:Value tail:(_ (MemberExpression / CallExpression))*
{ return tail.reduce((res, i) => ({...i[1], [i[1].type == "CallExpression" ? "callee" : "object"]: res}), head) }
MemberExpression = "." _ property:Identifier { return {type: "MemberExpression", property: property, computed: false} } /
"[" _ property:Expression _ "]" { return {type: "MemberExpression", property: property, computed: true} }
CallExpression = "(" args:(_ @Expression _)|0.., ","| ","? _ ")"
{ return {type: "CallExpression", arguments: args} }


SpreadExpression = expression:(SpreadSyntax / IfExpression / SwitchExpression / TryExpression / ForInExpression / WhileExpression / DoWhileExpression)
{ return {kind: "SpreadExpression", ...expression} }
SpreadSyntax = "..." _ expression:Expression { return {type: "SpreadSyntax", expression: expression} }

IfExpression = "if" _ "(" _ test:Expression _ ")" _ consequent:SpreadItem alternate:(_ "else" _ @SpreadItem)?
{ return {type: "IfExpression", test: test, consequent: consequent, alternate: alternate} }

SwitchExpression = "switch" _ "(" _ expression:Expression _ ")" cases:(_ @SwitchCase)+ _ defaultCase:("default" _ @SpreadItem)?
{ return {type: "SwitchExpression", expression: expression, cases: cases, default: defaultCase} }
SwitchCase = "case" _ "(" test:(_ @Expression _)|1.., ","| ","? _ ")" _ consequent:SpreadItem
{ return {type: "SwitchCase", test: test, consequent: consequent} }

TryExpression = "try" _ body:SpreadItem handler:(_ @CatchClause)? finalizer:(_ "finally" _ @SpreadItem)? !{ return handler === null && finalizer === null }
{ return {type: "TryExpression", body: body, handler: handler, finalizer: finalizer} }
CatchClause = "catch" param:(_ "(" _ @Identifier _ ")")? _ body:SpreadItem
{ return {type: "CatchClause", param: param, body: body} }

ForInExpression = "for" _ "(" _ item:Identifier index:(_ "," _ @Identifier)? __ "in" __ iterable:Expression _ ")" _ body:SpreadItem
{ return {type: "ForInExpression", item: item, index: index, iterable: iterable, body: body} }

WhileExpression = "while" _ "(" _ test:Expression _ ")" _ body:SpreadItem
{ return {type: "WhileExpression", test: test, body: body} }
DoWhileExpression = "do" _ body:SpreadItem _ "while" _ "(" _ test:Expression _ ")"
{ return {type: "DoWhileExpression", test: test, body: body} }

SpreadItem = Statement / KeyValuePair / Expression / SpreadExpression


Value = "(" _ @Expression _ ")" !(_ "=>") / Keyword / @Identifier !(_ "=>") / Literal

Keyword = "global" { return {type: "Global"} } / "builtin" { return {type: "Builtin"} }

Identifier = name:$(IdentifierStartChar IdentifierChar*) !{
  return reservedWords.includes(name)
} { return {type: "Identifier", name: name} }
IdentifierChar = IdentifierStartChar / [0-9]
IdentifierStartChar = [a-zA-Z_]


Literal = SimpleLiteral / FormattedString / Array / Object / LambdaExpression
SimpleLiteral = value:(Null / Boolean / Number / String) { return {type: "Literal", raw: text(), value: value} }

Null = "null" { return null }
Boolean = ("true" / "false") { return text() === "true" }
String = value:("'" @(EscapeSequence / [^'\n])* "'" / "@'" @("''" { return "'" } / [^'])* "'") { return value.join("") }

Number = Float / Integer
Float = value:$([0-9]* "."? [0-9]* ("E"i [+-]? [0-9]+)?) &{ return /[0-9]/.test(value) && /[.eE]/.test(value) } { return parseFloat(value) }
Integer = "0b"i value:[01]+ { return parseInt(value.join(""), 2) } /
"0o"i value:[0-7]+ { return parseInt(value.join(""), 8) } /
"0x"i [0-9a-fA-F]+ { return parseInt(text()) } /
[0-9]+ { return parseInt(text()) }

FormattedString = elems:('"' @(value:(EscapeSequence / [^"{}\n])+ { return {type: "FormattedStringElement", value: value.join("")} } / "{" _ @Expression _ "}")* '"' /
'@"' @(value:(('""' / "{{" / "}}") { return text()[0] } / [^"{}])+ { return {type: "FormattedStringElement", value: value.join("")} } / "{" _ @Expression _ "}")* '"')
{ return {type: "FormattedString", elements: elems} }

EscapeSequence = code:UnicodeEscapeSequence { return String.fromCodePoint(parseInt(code, 16)); } /
"\\" char:. { return escapeSequences[char] ?? char }
UnicodeEscapeSequence = "\\u{" code:$([^}]*) "}" { if (/^[0-9a-fA-F]{1,6}$/.test(code)) return code; else throw new SyntaxError("Bad character escape sequence."); } /
"\\u" code:$(.|4|) { if (/^[0-9a-fA-F]{4}$/.test(code)) return code; else throw new SyntaxError("Bad character escape sequence."); } /
"\\x" code:$(.|2|) { if (/^[0-9a-fA-F]{2}$/.test(code)) return code; else throw new SyntaxError("Bad character escape sequence."); }

Array = "[" elems:((_ @(Statement / @(Expression / SpreadExpression) _ ","))* (_ @(Expression / SpreadExpression))?) _ "]"
{ return {type: "Array", elements: [...elems[0], ...(elems[1] ? [elems[1]] : [])]} }

Object = "{" elems:((_ @(Statement / @(KeyValuePair / SpreadExpression) _ ","))* (_ @(KeyValuePair / SpreadExpression))?) _ "}"
{ return {type: "Object", elements: [...elems[0], ...(elems[1] ? [elems[1]] : [])]} }
KeyValuePair = key:(Identifier / SimpleLiteral / FormattedString) _ ":" _ value:Expression { return {type:"KeyValuePair", key: key, value: value} }

LambdaExpression = params:(param:Identifier { return [[param]] } /
"(" @((_ @Identifier _ !"=")|0.., ","| ("," @(_ @DefaultParam _)|0.., ","|)?) ","? _ ")") _ "=>" _ body:Expression
{ return {type: "LambdaExpression", params: [...params[0], ...(params[1] ?? [])], body: body} }
DefaultParam = left:Identifier _ "=" _ right:Expression { return {type: "DefaultParam", left: left, right: right} }


_ "space" = ([ \t\n\r] / Comment)*
__ "space" = ([ \t\n\r] / Comment)+

Comment = LineComment / BlockComment
LineComment = "//" [^\n]*
BlockComment = "/*" ([^*] / "*" !"/")* "*/"
