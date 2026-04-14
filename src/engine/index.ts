import { ExecutionStep, Language } from '@/types/visualizer';
import { executeJavaScript } from './javascript';
import { simulateCode } from './simulator';

export function executeCode(code: string, language: Language): ExecutionStep[] {
  if (!code.trim()) return [];

  try {
    if (language === 'javascript') {
      return executeJavaScript(code);
    }
    // C, C++, Java, Python all use the simulator
    return simulateCode(code, language);
  } catch (e: any) {
    return [{
      step: 1,
      lineNumber: 0,
      lineCode: `Error: ${e.message}`,
      memory: { variables: {}, arrays: {} },
      callStack: [],
      loops: [],
      changedVariables: [],
      conditionResult: null,
      swapAnimation: null,
      compareIndices: null,
      doneIndices: [],
      returnValue: null,
      output: [],
      error: e.message,
    }];
  }
}
