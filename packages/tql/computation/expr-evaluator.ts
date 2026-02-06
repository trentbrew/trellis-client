/**
 * Expression evaluator for LD-C @expr fields
 * Safely evaluates JavaScript expressions with access to context and built-in functions
 */

import {
  builtinFunctions,
  isBuiltinFunction,
  getBuiltinFunction,
} from './builtin-functions.js';

export interface EvaluationContext {
  [key: string]: any;
}

export interface EvaluationOptions {
  timeout?: number;
  allowUnsafe?: boolean;
  builtins?: boolean;
}

export interface EvaluationResult {
  value: any;
  error?: string;
  executionTime: number;
}

/**
 * Safe expression evaluator
 * Uses Function constructor with controlled scope to evaluate expressions
 */
export class ExprEvaluator {
  private defaultOptions: EvaluationOptions;

  constructor(options: EvaluationOptions = {}) {
    this.defaultOptions = {
      timeout: 1000, // 1 second default timeout
      allowUnsafe: false,
      builtins: true,
      ...options,
    };
  }

  /**
   * Evaluate an expression string with given context
   */
  evaluate(
    expr: string,
    context: EvaluationContext = {},
    options: EvaluationOptions = {},
  ): EvaluationResult {
    const startTime = performance.now();
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Validate expression
      if (!expr || typeof expr !== 'string') {
        throw new Error('Expression must be a non-empty string');
      }

      // Prepare evaluation scope
      const scope = this.prepareScope(context, opts);

      // Evaluate with timeout
      const value = this.evaluateWithTimeout(expr, scope, opts.timeout ?? 1000);

      const executionTime = performance.now() - startTime;

      return {
        value,
        executionTime,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return {
        value: undefined,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  /**
   * Evaluate multiple expressions in order (for dependencies)
   */
  evaluateBatch(
    expressions: Record<string, string>,
    context: EvaluationContext = {},
    options: EvaluationOptions = {},
  ): Record<string, EvaluationResult> {
    const results: Record<string, EvaluationResult> = {};
    const mergedContext = { ...context };

    // Evaluate in order, allowing later expressions to use earlier results
    for (const [key, expr] of Object.entries(expressions)) {
      const result = this.evaluate(expr, mergedContext, options);

      if (result.error) {
        results[key] = result;
      } else {
        results[key] = result;
        // Add result to context for subsequent evaluations
        mergedContext[key] = result.value;
      }
    }

    return results;
  }

  /**
   * Prepare evaluation scope with context and built-in functions
   */
  private prepareScope(
    context: EvaluationContext,
    options: EvaluationOptions,
  ): EvaluationContext {
    const scope: EvaluationContext = {};

    // Add context variables
    Object.assign(scope, context);

    // Add built-in functions if enabled
    if (options.builtins !== false) {
      Object.assign(scope, builtinFunctions);
    }

    return scope;
  }

  /**
   * Evaluate expression with timeout protection
   */
  private evaluateWithTimeout(
    expr: string,
    scope: EvaluationContext,
    timeout: number,
  ): any {
    // Create parameter names and values from scope
    // Filter to only valid JavaScript identifiers
    const validScope: EvaluationContext = {};
    const paramNames: string[] = [];
    const paramValues: any[] = [];

    for (const [key, value] of Object.entries(scope)) {
      // Only include valid JavaScript identifiers (must start with letter, $, or _)
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
        validScope[key] = value;
        paramNames.push(key);
        paramValues.push(value);
      }
    }

    try {
      // Create function with scope parameters
      const fn = new Function(...paramNames, `return (${expr})`);
      return fn(...paramValues);
    } catch (error) {
      throw new Error(
        `Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract variable references from an expression
   * Useful for dependency tracking
   */
  extractReferences(expr: string): string[] {
    const references: Set<string> = new Set();

    const varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    let match;

    while ((match = varPattern.exec(expr)) !== null) {
      const name = match[1];
      if (!name) continue;
      // Skip built-in functions and JavaScript keywords
      if (!isBuiltinFunction(name) && !this.isJavaScriptKeyword(name!)) {
        references.add(name);
      }
    }

    return Array.from(references);
  }

  /**
   * Check if a name is a JavaScript keyword
   */
  private isJavaScriptKeyword(name: string): boolean {
    const keywords = new Set([
      'break',
      'case',
      'catch',
      'class',
      'const',
      'continue',
      'debugger',
      'default',
      'delete',
      'do',
      'else',
      'enum',
      'export',
      'extends',
      'false',
      'finally',
      'for',
      'function',
      'if',
      'import',
      'in',
      'instanceof',
      'new',
      'null',
      'return',
      'super',
      'switch',
      'this',
      'throw',
      'true',
      'try',
      'typeof',
      'var',
      'void',
      'while',
      'with',
      'yield',
      'async',
      'await',
      'let',
      'static',
      'get',
      'set',
      'Math',
      'Date',
      'Array',
      'Object',
      'String',
      'Number',
      'Boolean',
      'JSON',
      'RegExp',
      'Error',
      'Promise',
      'Map',
      'Set',
      'WeakMap',
      'WeakSet',
      'Symbol',
      'Proxy',
      'Reflect',
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array',
      'BigInt64Array',
      'BigUint64Array',
      'DataView',
      'ArrayBuffer',
      'SharedArrayBuffer',
      'Atomics',
      'FinalizationRegistry',
      'WeakRef',
      'globalThis',
    ]);

    return keywords.has(name);
  }

  /**
   * Validate an expression syntax without evaluating
   */
  validate(expr: string): { valid: boolean; error?: string } {
    try {
      if (!expr || typeof expr !== 'string') {
        return { valid: false, error: 'Expression must be a non-empty string' };
      }

      // Try to parse as function
      new Function(`return (${expr})`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Convenience function to evaluate a single expression
 */
export function evaluateExpression(
  expr: string,
  context: EvaluationContext = {},
  options?: EvaluationOptions,
): EvaluationResult {
  const evaluator = new ExprEvaluator(options);
  return evaluator.evaluate(expr, context, options);
}

/**
 * Convenience function to evaluate multiple expressions
 */
export function evaluateExpressions(
  expressions: Record<string, string>,
  context: EvaluationContext = {},
  options?: EvaluationOptions,
): Record<string, EvaluationResult> {
  const evaluator = new ExprEvaluator(options);
  return evaluator.evaluateBatch(expressions, context, options);
}

/**
 * Extract @expr fields from an LD-C document
 */
export function extractExprFields(document: any): Record<string, string> {
  const exprFields: Record<string, string> = {};

  function traverse(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value && typeof value === 'object' && '@expr' in value) {
        const exprValue = (value as { '@expr': string })['@expr'];
        if (typeof exprValue === 'string') {
          exprFields[currentPath] = exprValue;
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          traverse(item, `${currentPath}[${index}]`);
        });
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, currentPath);
      }
    }
  }

  traverse(document);
  return exprFields;
}

/**
 * Evaluate all @expr fields in an LD-C document
 */
export function evaluateDocument(
  document: any,
  context: EvaluationContext = {},
  options?: EvaluationOptions,
): any {
  const evaluator = new ExprEvaluator(options);
  const exprFields = extractExprFields(document);

  // Build full context from document (flatten nested paths)
  const documentContext: EvaluationContext = { ...context };

  function buildContext(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Skip @expr fields and @ prefixed keys (they can't be JS identifiers)
      if (value && typeof value === 'object' && '@expr' in value) {
        continue;
      }
      if (key.startsWith('@')) {
        continue;
      }

      // Add to context with both full path and simple key (for top-level)
      // Don't override existing context values
      if (!(currentPath in documentContext)) {
        documentContext[currentPath] = value;
      }
      if (!path && !(key in documentContext)) {
        documentContext[key] = value;
      }

      // Recurse into nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          // Add the full array to context (for array methods like reduce, map, etc.)
          // This is crucial for expressions like items.reduce(...)
          if (!(currentPath in documentContext)) {
            documentContext[currentPath] = value;
          }
          if (!path && !(key in documentContext)) {
            documentContext[key] = value;
          }

          // Build context for array items with indexed paths
          value.forEach((item, index) => {
            const itemPath = `${currentPath}[${index}]`;
            if (!(itemPath in documentContext)) {
              documentContext[itemPath] = item;
            }
            // Recurse into array item if it's an object
            if (typeof item === 'object' && item !== null) {
              buildContext(item, itemPath);
            }
          });
        } else {
          buildContext(value, currentPath);
        }
      }
    }
  }

  buildContext(document);

  // Evaluate all expressions
  const results = evaluator.evaluateBatch(exprFields, documentContext, options);

  // Create a deep copy and replace @expr fields with evaluated values
  const evaluated = JSON.parse(JSON.stringify(document));

  function replaceExprFields(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value && typeof value === 'object' && '@expr' in value) {
        const result = results[currentPath];
        if (result && !result.error) {
          obj[key] = result.value;
        } else {
          // Keep original if evaluation failed
          obj[key] = value;
        }
      } else if (Array.isArray(value)) {
        value.forEach((item: any, index: number) => {
          replaceExprFields(item, `${currentPath}[${index}]`);
        });
      } else if (typeof value === 'object' && value !== null) {
        replaceExprFields(value, currentPath);
      }
    }
  }

  replaceExprFields(evaluated);
  return evaluated;
}
