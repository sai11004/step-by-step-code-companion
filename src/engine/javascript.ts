import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { ExecutionStep } from '@/types/visualizer';

interface Scope {
  variables: Record<string, any>;
  arrays: Record<string, any[]>;
  parent: Scope | null;
}

function createScope(parent: Scope | null = null): Scope {
  return { variables: {}, arrays: {}, parent };
}

function setVar(scope: Scope, name: string, value: any) {
  if (Array.isArray(value)) {
    scope.arrays[name] = [...value];
  } else {
    scope.variables[name] = value;
  }
}

function getVar(scope: Scope, name: string): any {
  if (name in scope.variables) return scope.variables[name];
  if (name in scope.arrays) return scope.arrays[name];
  if (scope.parent) return getVar(scope.parent, name);
  return undefined;
}

function getAllMemory(scope: Scope): { variables: Record<string, any>; arrays: Record<string, any[]> } {
  const vars: Record<string, any> = {};
  const arrs: Record<string, any[]> = {};
  let s: Scope | null = scope;
  while (s) {
    for (const [k, v] of Object.entries(s.variables)) {
      if (!(k in vars)) vars[k] = v;
    }
    for (const [k, v] of Object.entries(s.arrays)) {
      if (!(k in arrs)) arrs[k] = [...v];
    }
    s = s.parent;
  }
  return { variables: vars, arrays: arrs };
}

const MAX_STEPS = 500;
const MAX_ITERATIONS = 1000;

export function executeJavaScript(code: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const outputs: string[] = [];
  const callStack: { name: string; params: Record<string, any> }[] = [{ name: 'main', params: {} }];
  const lines = code.split('\n');
  let iterationCount = 0;

  let ast: acorn.Node;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2020, sourceType: 'script', locations: true });
  } catch (e: any) {
    return [{
      step: 1, lineNumber: e.loc?.line || 0, lineCode: e.message,
      memory: { variables: {}, arrays: {} }, callStack: [], loops: [],
      changedVariables: [], conditionResult: null, swapAnimation: null,
      compareIndices: null, doneIndices: [], returnValue: null,
      output: [], error: e.message,
    }];
  }

  const functions: Record<string, any> = {};

  function addStep(lineNum: number, scope: Scope, extra: Partial<ExecutionStep> = {}) {
    if (steps.length >= MAX_STEPS) return;
    const memory = getAllMemory(scope);
    const prev = steps[steps.length - 1];
    const changed: string[] = [];
    if (prev) {
      for (const [k, v] of Object.entries(memory.variables)) {
        if (prev.memory.variables[k] !== v) changed.push(k);
      }
      for (const [k, v] of Object.entries(memory.arrays)) {
        const pArr = prev.memory.arrays[k];
        if (!pArr || JSON.stringify(pArr) !== JSON.stringify(v)) changed.push(k);
      }
    }

    // Detect swap
    let swapAnimation: [number, number] | null = null;
    if (prev) {
      for (const [arrName, currArr] of Object.entries(memory.arrays)) {
        const prevArr = prev.memory.arrays[arrName];
        if (!prevArr || prevArr.length !== currArr.length) continue;
        const diffs = [];
        for (let i = 0; i < currArr.length; i++) {
          if (currArr[i] !== prevArr[i]) diffs.push(i);
        }
        if (diffs.length === 2) {
          const [a, b] = diffs;
          if (currArr[a] === prevArr[b] && currArr[b] === prevArr[a]) {
            swapAnimation = [a, b];
          }
        }
      }
    }

    steps.push({
      step: steps.length + 1,
      lineNumber: lineNum,
      lineCode: lines[lineNum - 1]?.trim() || '',
      memory,
      callStack: callStack.map(f => ({ ...f })),
      loops: [],
      changedVariables: changed,
      conditionResult: null,
      swapAnimation,
      compareIndices: null,
      doneIndices: [],
      returnValue: null,
      output: [...outputs],
      ...extra,
    });
  }

  function evalExpr(node: any, scope: Scope): any {
    if (!node) return undefined;
    switch (node.type) {
      case 'Literal': return node.value;
      case 'Identifier': return getVar(scope, node.name);
      case 'ArrayExpression': return node.elements.map((el: any) => evalExpr(el, scope));
      case 'BinaryExpression': case 'LogicalExpression': {
        const l = evalExpr(node.left, scope);
        const r = evalExpr(node.right, scope);
        switch (node.operator) {
          case '+': return l + r; case '-': return l - r;
          case '*': return l * r; case '/': return l / r;
          case '%': return l % r; case '**': return l ** r;
          case '<': return l < r; case '>': return l > r;
          case '<=': return l <= r; case '>=': return l >= r;
          case '==': return l == r; case '===': return l === r;
          case '!=': return l != r; case '!==': return l !== r;
          case '&&': return l && r; case '||': return l || r;
          default: return undefined;
        }
      }
      case 'UnaryExpression': {
        const arg = evalExpr(node.argument, scope);
        if (node.operator === '-') return -arg;
        if (node.operator === '!') return !arg;
        if (node.operator === '+') return +arg;
        if (node.operator === 'typeof') return typeof arg;
        return undefined;
      }
      case 'UpdateExpression': {
        const name = node.argument.name;
        let val = getVar(scope, name);
        const oldVal = val;
        if (node.operator === '++') val++; else val--;
        setVar(scope, name, val);
        return node.prefix ? val : oldVal;
      }
      case 'AssignmentExpression': {
        let val = evalExpr(node.right, scope);
        if (node.left.type === 'Identifier') {
          if (node.operator === '+=') val = getVar(scope, node.left.name) + val;
          else if (node.operator === '-=') val = getVar(scope, node.left.name) - val;
          else if (node.operator === '*=') val = getVar(scope, node.left.name) * val;
          setVar(scope, node.left.name, val);
          return val;
        }
        if (node.left.type === 'MemberExpression') {
          return assignMember(node.left, val, scope, node.operator);
        }
        return val;
      }
      case 'MemberExpression': {
        const obj = evalExpr(node.object, scope);
        const prop = node.computed ? evalExpr(node.property, scope) : node.property.name;
        if (Array.isArray(obj) && prop === 'length') return obj.length;
        if (Array.isArray(obj) && typeof prop === 'number') return obj[prop];
        if (obj && typeof obj === 'object') return obj[prop];
        return undefined;
      }
      case 'CallExpression': {
        // console.log
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'console' &&
            node.callee.property.name === 'log') {
          const args = node.arguments.map((a: any) => evalExpr(a, scope));
          const out = args.map((a: any) => {
            if (Array.isArray(a)) return JSON.stringify(a);
            return String(a);
          }).join(' ');
          outputs.push(out);
          return undefined;
        }
        // Array methods
        if (node.callee.type === 'MemberExpression') {
          const obj = evalExpr(node.callee.object, scope);
          const method = node.callee.property.name;
          if (Array.isArray(obj)) {
            if (method === 'push') {
              const args = node.arguments.map((a: any) => evalExpr(a, scope));
              obj.push(...args);
              // Update the array in scope
              if (node.callee.object.type === 'Identifier') {
                setVar(scope, node.callee.object.name, obj);
              }
              return obj.length;
            }
            if (method === 'pop') { const v = obj.pop(); return v; }
            if (method === 'join') { return obj.join(evalExpr(node.arguments[0], scope)); }
          }
        }
        // User-defined function
        const funcName = node.callee.name || node.callee.property?.name;
        const func = functions[funcName];
        if (func) {
          const args = node.arguments.map((a: any) => evalExpr(a, scope));
          const funcScope = createScope(scope);
          const params: Record<string, any> = {};
          func.params.forEach((p: any, i: number) => {
            const val = args[i];
            setVar(funcScope, p.name, val);
            params[p.name] = Array.isArray(val) ? `[${val.join(',')}]` : val;
          });
          callStack.unshift({ name: `${funcName}()`, params });
          const result = execBlock(func.body.body || [func.body], funcScope);
          callStack.shift();
          return result?.value;
        }
        // Math functions
        if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'Math') {
          const method = node.callee.property.name;
          const args = node.arguments.map((a: any) => evalExpr(a, scope));
          return (Math as any)[method](...args);
        }
        return undefined;
      }
      case 'ConditionalExpression': {
        return evalExpr(node.test, scope) ? evalExpr(node.consequent, scope) : evalExpr(node.alternate, scope);
      }
      case 'TemplateLiteral': {
        let str = '';
        for (let i = 0; i < node.quasis.length; i++) {
          str += node.quasis[i].value.cooked;
          if (i < node.expressions.length) str += String(evalExpr(node.expressions[i], scope));
        }
        return str;
      }
      default: return undefined;
    }
  }

  function assignMember(node: any, value: any, scope: Scope, operator: string = '='): any {
    const obj = evalExpr(node.object, scope);
    const prop = node.computed ? evalExpr(node.property, scope) : node.property.name;
    if (Array.isArray(obj) && typeof prop === 'number') {
      if (operator === '+=') obj[prop] += value;
      else if (operator === '-=') obj[prop] -= value;
      else obj[prop] = value;
      if (node.object.type === 'Identifier') setVar(scope, node.object.name, obj);
    }
    return value;
  }

  interface ExecResult { type: 'return' | 'break' | 'continue'; value?: any }

  function execBlock(body: any[], scope: Scope): ExecResult | undefined {
    for (const stmt of body) {
      if (steps.length >= MAX_STEPS) return;
      const result = execStatement(stmt, scope);
      if (result) return result;
    }
    return undefined;
  }

  function execStatement(node: any, scope: Scope): ExecResult | undefined {
    if (!node || steps.length >= MAX_STEPS) return;
    const line = node.loc?.start?.line;

    switch (node.type) {
      case 'FunctionDeclaration': {
        functions[node.id.name] = node;
        if (line) addStep(line, scope);
        return;
      }
      case 'VariableDeclaration': {
        for (const decl of node.declarations) {
          const val = decl.init ? evalExpr(decl.init, scope) : undefined;
          setVar(scope, decl.id.name, val);
        }
        if (line) addStep(line, scope);
        return;
      }
      case 'ExpressionStatement': {
        evalExpr(node.expression, scope);
        if (line) addStep(line, scope);
        return;
      }
      case 'IfStatement': {
        const test = evalExpr(node.test, scope);
        if (line) addStep(line, scope, { conditionResult: !!test });
        if (test) {
          const r = node.consequent.type === 'BlockStatement'
            ? execBlock(node.consequent.body, scope)
            : execStatement(node.consequent, scope);
          if (r) return r;
        } else if (node.alternate) {
          const r = node.alternate.type === 'BlockStatement'
            ? execBlock(node.alternate.body, scope)
            : execStatement(node.alternate, scope);
          if (r) return r;
        }
        return;
      }
      case 'ForStatement': {
        if (node.init) {
          if (node.init.type === 'VariableDeclaration') {
            for (const decl of node.init.declarations) {
              setVar(scope, decl.id.name, decl.init ? evalExpr(decl.init, scope) : undefined);
            }
          } else {
            evalExpr(node.init, scope);
          }
          if (line) addStep(line, scope);
        }
        let loopCount = 0;
        while (evalExpr(node.test, scope)) {
          if (++loopCount > MAX_ITERATIONS || steps.length >= MAX_STEPS) break;
          iterationCount++;
          if (line) {
            const testResult = evalExpr(node.test, scope);
            addStep(line, scope, { conditionResult: !!testResult });
          }
          const r = node.body.type === 'BlockStatement'
            ? execBlock(node.body.body, scope)
            : execStatement(node.body, scope);
          if (r?.type === 'break') break;
          if (r?.type === 'return') return r;
          if (node.update) evalExpr(node.update, scope);
        }
        return;
      }
      case 'WhileStatement': {
        let loopCount = 0;
        while (evalExpr(node.test, scope)) {
          if (++loopCount > MAX_ITERATIONS || steps.length >= MAX_STEPS) break;
          if (line) addStep(line, scope, { conditionResult: true });
          const r = node.body.type === 'BlockStatement'
            ? execBlock(node.body.body, scope)
            : execStatement(node.body, scope);
          if (r?.type === 'break') break;
          if (r?.type === 'return') return r;
        }
        if (line) addStep(line, scope, { conditionResult: false });
        return;
      }
      case 'ReturnStatement': {
        const val = node.argument ? evalExpr(node.argument, scope) : undefined;
        if (line) addStep(line, scope, { returnValue: val });
        return { type: 'return', value: val };
      }
      case 'BreakStatement': return { type: 'break' };
      case 'ContinueStatement': return { type: 'continue' };
      case 'BlockStatement': return execBlock(node.body, scope);
      default: {
        if (line) addStep(line, scope);
        return;
      }
    }
  }

  const globalScope = createScope();
  try {
    execBlock((ast as any).body, globalScope);
  } catch (e: any) {
    steps.push({
      step: steps.length + 1, lineNumber: 0, lineCode: `Error: ${e.message}`,
      memory: { variables: {}, arrays: {} }, callStack: [], loops: [],
      changedVariables: [], conditionResult: null, swapAnimation: null,
      compareIndices: null, doneIndices: [], returnValue: null,
      output: [...outputs], error: e.message,
    });
  }

  return steps;
}
