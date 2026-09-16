/**
 * Motor de Fórmula Simples das Bases: "não permitir JavaScript, código arbitrário ou execução
 * dinâmica dentro de fórmulas". Este parser/avaliador é o único código que interpreta a
 * expressão — nunca `eval`/`new Function`. Suporta aritmética, comparações, booleanos,
 * concatenação (CONCAT), condicional (IF) e diferença de datas (DATEDIFF), referenciando
 * propriedades da própria página via identificador. Determinístico: mesma expressão + mesmo
 * contexto sempre produzem o mesmo resultado, em qualquer plataforma, inclusive offline.
 */

export type FormulaValue = string | number | boolean | null;
export type FormulaContext = Record<string, FormulaValue>;

type TokenType = "number" | "string" | "ident" | "op" | "lparen" | "rparen" | "comma" | "eof";
interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const multiCharOps = ["==", "!=", ">=", "<=", "&&", "||"];

  while (i < expression.length) {
    const char = expression[i]!;

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    if (char === "(") {
      tokens.push({ type: "lparen", value: char });
      i += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ type: "rparen", value: char });
      i += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      i += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let value = "";
      i += 1;
      while (i < expression.length && expression[i] !== quote) {
        value += expression[i];
        i += 1;
      }
      i += 1;
      tokens.push({ type: "string", value });
      continue;
    }
    if (/[0-9]/.test(char)) {
      let value = "";
      while (i < expression.length && /[0-9.]/.test(expression[i]!)) {
        value += expression[i];
        i += 1;
      }
      tokens.push({ type: "number", value });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      let value = "";
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i]!)) {
        value += expression[i];
        i += 1;
      }
      tokens.push({ type: "ident", value });
      continue;
    }

    const twoChar = expression.slice(i, i + 2);
    if (multiCharOps.includes(twoChar)) {
      tokens.push({ type: "op", value: twoChar });
      i += 2;
      continue;
    }
    if ("+-*/<>!".includes(char)) {
      tokens.push({ type: "op", value: char });
      i += 1;
      continue;
    }

    throw new Error(`Fórmula: caractere inesperado "${char}"`);
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class Parser {
  private position = 0;
  constructor(
    private tokens: Token[],
    private context: FormulaContext,
  ) {}

  private peek(): Token {
    return this.tokens[this.position]!;
  }

  private consume(): Token {
    const token = this.peek();
    this.position += 1;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.consume();
    if (token.type !== type) throw new Error(`Fórmula: esperado ${type}, encontrado "${token.value}"`);
    return token;
  }

  parse(): FormulaValue {
    const result = this.parseOr();
    this.expect("eof");
    return result;
  }

  private parseOr(): FormulaValue {
    let left = this.parseAnd();
    while (this.peek().type === "op" && this.peek().value === "||") {
      this.consume();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): FormulaValue {
    let left = this.parseEquality();
    while (this.peek().type === "op" && this.peek().value === "&&") {
      this.consume();
      const right = this.parseEquality();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseEquality(): FormulaValue {
    let left = this.parseComparison();
    while (this.peek().type === "op" && (this.peek().value === "==" || this.peek().value === "!=")) {
      const op = this.consume().value;
      const right = this.parseComparison();
      left = op === "==" ? left === right : left !== right;
    }
    return left;
  }

  private parseComparison(): FormulaValue {
    let left = this.parseAdditive();
    while (
      this.peek().type === "op" &&
      ["<", "<=", ">", ">="].includes(this.peek().value)
    ) {
      const op = this.consume().value;
      const right = this.parseAdditive();
      const a = Number(left);
      const b = Number(right);
      if (op === "<") left = a < b;
      else if (op === "<=") left = a <= b;
      else if (op === ">") left = a > b;
      else left = a >= b;
    }
    return left;
  }

  private parseAdditive(): FormulaValue {
    let left = this.parseMultiplicative();
    while (this.peek().type === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.consume().value;
      const right = this.parseMultiplicative();
      left = op === "+" ? Number(left) + Number(right) : Number(left) - Number(right);
    }
    return left;
  }

  private parseMultiplicative(): FormulaValue {
    let left = this.parseUnary();
    while (this.peek().type === "op" && (this.peek().value === "*" || this.peek().value === "/")) {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = op === "*" ? Number(left) * Number(right) : Number(left) / Number(right);
    }
    return left;
  }

  private parseUnary(): FormulaValue {
    if (this.peek().type === "op" && this.peek().value === "!") {
      this.consume();
      return !this.parseUnary();
    }
    if (this.peek().type === "op" && this.peek().value === "-") {
      this.consume();
      return -Number(this.parseUnary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaValue {
    const token = this.peek();

    if (token.type === "number") {
      this.consume();
      return Number(token.value);
    }
    if (token.type === "string") {
      this.consume();
      return token.value;
    }
    if (token.type === "lparen") {
      this.consume();
      const value = this.parseOr();
      this.expect("rparen");
      return value;
    }
    if (token.type === "ident") {
      this.consume();
      if (token.value === "true") return true;
      if (token.value === "false") return false;
      if (this.peek().type === "lparen") return this.parseFunctionCall(token.value);
      if (!(token.value in this.context)) {
        throw new Error(`Fórmula: propriedade "${token.value}" não encontrada`);
      }
      return this.context[token.value] ?? null;
    }

    throw new Error(`Fórmula: token inesperado "${token.value}"`);
  }

  private parseFunctionCall(name: string): FormulaValue {
    this.expect("lparen");
    const args: FormulaValue[] = [];
    if (this.peek().type !== "rparen") {
      args.push(this.parseOr());
      while (this.peek().type === "comma") {
        this.consume();
        args.push(this.parseOr());
      }
    }
    this.expect("rparen");

    switch (name) {
      case "IF":
        return Boolean(args[0]) ? (args[1] ?? null) : (args[2] ?? null);
      case "CONCAT":
        return args.map((a) => (a === null ? "" : String(a))).join("");
      case "DATEDIFF": {
        const a = new Date(String(args[0]));
        const b = new Date(String(args[1]));
        return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
      }
      case "NOW":
        return new Date().toISOString();
      default:
        throw new Error(`Fórmula: função desconhecida "${name}"`);
    }
  }
}

export function evaluateFormula(expression: string, context: FormulaContext): FormulaValue {
  const tokens = tokenize(expression);
  return new Parser(tokens, context).parse();
}
