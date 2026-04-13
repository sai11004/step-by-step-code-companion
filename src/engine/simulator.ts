import { ExecutionStep, Language } from '@/types/visualizer';

/**
 * Simple pattern-based simulator for Python/Java/C++
 * Parses common patterns and generates step traces
 */

const MAX_STEPS = 500;

interface SimScope {
  variables: Record<string, any>;
  arrays: Record<string, any[]>;
}

function parseLine(line: string, scope: SimScope, outputs: string[]): { changed: string[]; conditionResult?: boolean } {
  const trimmed = line.trim();
  const changed: string[] = [];

  // Skip empty lines, comments, includes, using
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') ||
      trimmed.startsWith('import') || trimmed.startsWith('using') ||
      trimmed.startsWith('#include') || trimmed.startsWith('public class') ||
      trimmed.startsWith('class ') || trimmed === '{' || trimmed === '}' ||
      trimmed.startsWith('void ') || trimmed.startsWith('int main') ||
      trimmed.startsWith('def ') || trimmed.startsWith('public static')) {
    return { changed };
  }

  // Python print
  const printMatch = trimmed.match(/^print\s*\((.+)\)$/);
  if (printMatch) {
    const arg = evaluateExpr(printMatch[1], scope);
    outputs.push(String(arg));
    return { changed };
  }

  // cout
  const coutMatch = trimmed.match(/cout\s*<<\s*(.+?)(?:\s*;)?$/);
  if (coutMatch) {
    const parts = coutMatch[1].split('<<').map(p => p.trim()).filter(p => p && p !== 'endl');
    const out = parts.map(p => {
      if (p.startsWith('"')) return p.replace(/"/g, '');
      return String(evaluateExpr(p, scope));
    }).join('');
    outputs.push(out);
    return { changed };
  }

  // System.out.print
  const soutMatch = trimmed.match(/System\.out\.print(?:ln)?\s*\((.+)\)/);
  if (soutMatch) {
    const arg = evaluateExpr(soutMatch[1], scope);
    outputs.push(String(arg));
    return { changed };
  }

  // Variable assignment: x = 5, int x = 5, let x = 5
  const assignMatch = trimmed.match(/^(?:int|float|double|string|let|const|var|auto)?\s*(\w+)\s*=\s*(.+?)(?:;)?$/);
  if (assignMatch) {
    const [, name, expr] = assignMatch;
    const val = evaluateExpr(expr, scope);
    if (Array.isArray(val)) {
      scope.arrays[name] = val;
    } else {
      scope.variables[name] = val;
    }
    changed.push(name);
    return { changed };
  }

  // Array element assignment: arr[i] = val
  const arrAssign = trimmed.match(/^(\w+)\[(.+?)\]\s*=\s*(.+?)(?:;)?$/);
  if (arrAssign) {
    const [, name, idxExpr, valExpr] = arrAssign;
    const idx = evaluateExpr(idxExpr, scope);
    const val = evaluateExpr(valExpr, scope);
    if (scope.arrays[name]) {
      scope.arrays[name][idx] = val;
      changed.push(name);
    }
    return { changed };
  }

  // Python swap: arr[j], arr[j + 1] = arr[j + 1], arr[j]
  const swapMatch = trimmed.match(/^(\w+)\[(.+?)\]\s*,\s*(\w+)\[(.+?)\]\s*=\s*(\w+)\[(.+?)\]\s*,\s*(\w+)\[(.+?)\]$/);
  if (swapMatch) {
    const arr1 = swapMatch[1];
    const idx1 = evaluateExpr(swapMatch[2], scope);
    const idx2 = evaluateExpr(swapMatch[4], scope);
    if (scope.arrays[arr1]) {
      const temp = scope.arrays[arr1][idx1];
      scope.arrays[arr1][idx1] = scope.arrays[arr1][idx2];
      scope.arrays[arr1][idx2] = temp;
      changed.push(arr1);
    }
    return { changed };
  }

  // Increment: i++, i--
  const incMatch = trimmed.match(/^(\w+)(\+\+|--)(?:;)?$/);
  if (incMatch) {
    const [, name, op] = incMatch;
    if (name in scope.variables) {
      scope.variables[name] += op === '++' ? 1 : -1;
      changed.push(name);
    }
    return { changed };
  }

  return { changed };
}

function evaluateExpr(expr: string, scope: SimScope): any {
  const trimmed = expr.trim();

  // String literal
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  // Boolean
  if (trimmed === 'true' || trimmed === 'True') return true;
  if (trimmed === 'false' || trimmed === 'False') return false;

  // Array literal [1, 2, 3] or {1, 2, 3}
  const arrMatch = trimmed.match(/^[\[{](.+?)[\]}]$/);
  if (arrMatch) {
    return arrMatch[1].split(',').map(v => evaluateExpr(v.trim(), scope));
  }

  // len(x) / .length
  const lenMatch = trimmed.match(/^len\((\w+)\)$/);
  if (lenMatch) {
    const arr = scope.arrays[lenMatch[1]];
    return arr ? arr.length : 0;
  }
  const lenMatch2 = trimmed.match(/^(\w+)\.length$/);
  if (lenMatch2) {
    const arr = scope.arrays[lenMatch2[1]];
    return arr ? arr.length : 0;
  }

  // range(n) - return n
  const rangeMatch = trimmed.match(/^range\((.+)\)$/);
  if (rangeMatch) return evaluateExpr(rangeMatch[1], scope);

  // Array access: arr[i]
  const accMatch = trimmed.match(/^(\w+)\[(.+?)\]$/);
  if (accMatch) {
    const arr = scope.arrays[accMatch[1]];
    const idx = evaluateExpr(accMatch[2], scope);
    return arr ? arr[idx] : undefined;
  }

  // Variable
  if (/^\w+$/.test(trimmed)) {
    if (trimmed in scope.variables) return scope.variables[trimmed];
    if (trimmed in scope.arrays) return scope.arrays[trimmed];
    return trimmed;
  }

  // Binary operations
  for (const op of ['>=', '<=', '!=', '==', '>', '<', '+', '-', '*', '/', '%']) {
    const idx = findOperator(trimmed, op);
    if (idx !== -1) {
      const left = evaluateExpr(trimmed.slice(0, idx), scope);
      const right = evaluateExpr(trimmed.slice(idx + op.length), scope);
      switch (op) {
        case '+': return (typeof left === 'number' && typeof right === 'number') ? left + right : String(left) + String(right);
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '%': return left % right;
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left == right;
        case '!=': return left != right;
      }
    }
  }

  return trimmed;
}

function findOperator(expr: string, op: string): number {
  let depth = 0;
  for (let i = expr.length - 1; i >= 0; i--) {
    if (expr[i] === ')' || expr[i] === ']') depth++;
    if (expr[i] === '(' || expr[i] === '[') depth--;
    if (depth === 0 && expr.substring(i, i + op.length) === op) {
      if (i > 0 || op !== '-') return i;
    }
  }
  return -1;
}

export function simulateCode(code: string, language: Language): ExecutionStep[] {
  const lines = code.split('\n');
  const steps: ExecutionStep[] = [];
  const outputs: string[] = [];
  const scope: SimScope = { variables: {}, arrays: {} };
  const callStack = [{ name: 'main', params: {} }];

  // Simple line-by-line execution with basic loop detection
  let i = 0;
  let totalSteps = 0;
  const loopStack: { start: number; end: number; count: number }[] = [];

  while (i < lines.length && totalSteps < MAX_STEPS) {
    const line = lines[i];
    const trimmed = line.trim();
    totalSteps++;

    // Skip empty/comment lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') ||
        trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      i++;
      continue;
    }

    // Detect for loop
    const forMatch = trimmed.match(/^for\s*\(?\s*(?:int|let|var)?\s*(\w+)\s*(?:=|in)\s*(?:range\()?(.+?)(?:\))?\s*;\s*\w+\s*([<>=!]+)\s*(.+?)\s*;\s*\w+(\+\+|--)/);
    const pyForMatch = trimmed.match(/^for\s+(\w+)\s+in\s+range\((.+)\)/);

    if (forMatch || pyForMatch) {
      const varName = (forMatch || pyForMatch)![1];
      let start = 0, end = 0;
      if (forMatch) {
        start = Number(evaluateExpr(forMatch[2], scope));
        end = Number(evaluateExpr(forMatch[4], scope));
      } else if (pyForMatch) {
        const rangeArgs = pyForMatch[2].split(',').map(a => Number(evaluateExpr(a.trim(), scope)));
        if (rangeArgs.length === 1) { start = 0; end = rangeArgs[0]; }
        else { start = rangeArgs[0]; end = rangeArgs[1]; }
      }

      // Find loop body end
      let bodyEnd = i + 1;
      let depth = 0;
      if (trimmed.endsWith(':')) {
        // Python: find indented block
        const baseIndent = line.search(/\S/);
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() === '') continue;
          const indent = lines[j].search(/\S/);
          if (indent <= baseIndent) { bodyEnd = j; break; }
          bodyEnd = j + 1;
        }
      } else {
        // C-style: find matching brace
        for (let j = i; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === '{') depth++;
            if (ch === '}') { depth--; if (depth === 0) { bodyEnd = j + 1; break; } }
          }
          if (depth === 0 && j > i) break;
        }
      }

      // Execute loop iterations
      for (let iter = start; iter < end && totalSteps < MAX_STEPS; iter++) {
        scope.variables[varName] = iter;
        addSimStep(i + 1, trimmed, scope, outputs, steps, callStack, [varName]);

        // Execute body lines
        for (let j = i + 1; j < bodyEnd && totalSteps < MAX_STEPS; j++) {
          const bodyLine = lines[j].trim();
          if (!bodyLine || bodyLine === '{' || bodyLine === '}') continue;

          // Check for nested for loop
          const nestedFor = bodyLine.match(/^for\s/);
          if (nestedFor) {
            // Skip nested loops for simplicity - just execute body lines
          }

          const { changed } = parseLine(bodyLine, scope, outputs);
          totalSteps++;
          addSimStep(j + 1, bodyLine, scope, outputs, steps, callStack, changed);
        }
      }
      i = bodyEnd;
      continue;
    }

    // Regular line
    const { changed } = parseLine(trimmed, scope, outputs);
    if (changed.length > 0 || trimmed.startsWith('print') || trimmed.startsWith('cout') || trimmed.startsWith('System.out')) {
      addSimStep(i + 1, trimmed, scope, outputs, steps, callStack, changed);
    }
    i++;
  }

  return steps;
}

function addSimStep(
  lineNum: number, lineCode: string, scope: SimScope,
  outputs: string[], steps: ExecutionStep[],
  callStack: { name: string; params: Record<string, any> }[],
  changed: string[]
) {
  // Detect swap
  let swapAnimation: [number, number] | null = null;
  const prev = steps[steps.length - 1];
  if (prev) {
    for (const [arrName, currArr] of Object.entries(scope.arrays)) {
      const prevArr = prev.memory.arrays[arrName];
      if (!prevArr || prevArr.length !== currArr.length) continue;
      const diffs = [];
      for (let k = 0; k < currArr.length; k++) {
        if (currArr[k] !== prevArr[k]) diffs.push(k);
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
    lineCode,
    memory: {
      variables: { ...scope.variables },
      arrays: Object.fromEntries(Object.entries(scope.arrays).map(([k, v]) => [k, [...v]])),
    },
    callStack: callStack.map(f => ({ ...f })),
    loops: [],
    changedVariables: changed,
    conditionResult: null,
    swapAnimation,
    compareIndices: null,
    doneIndices: [],
    returnValue: null,
    output: [...outputs],
  });
}
