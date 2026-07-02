/**
 * Formula evaluator for post-query formula execution
 * Provides a simple interface for evaluating formulas against query result rows
 */

import { builtinFunctions } from './builtin-functions.js';

/**
 * Evaluate a formula string against a row of data
 * This is used for post-query formula enrichment in the API
 */
export function evaluateFormula(
  formula: string,
  row: Record<string, unknown>,
): unknown {
  try {
    let expr = formula;

    // Build a clean row with simple key names extracted from prefixed keys
    // e.g., "?d.users.age" -> "age", "?u.name" -> "name"
    const cleanRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      // Add the full key
      cleanRow[key] = value;
      // Extract the last part after the last dot for simple access
      const parts = key.split('.');
      const simpleName = parts[parts.length - 1];
      if (simpleName && !cleanRow[simpleName]) {
        cleanRow[simpleName] = value;
      }
      // Also add without the "?" prefix variable part
      if (key.startsWith('?')) {
        const withoutVar = key.replace(/^\?[^.]*\./, '');
        if (withoutVar !== key) {
          cleanRow[withoutVar] = value;
          const simplePart = withoutVar.split('.').pop();
          if (simplePart && !cleanRow[simplePart]) {
            cleanRow[simplePart] = value;
          }
        }
      }
    }

    // Build function context with all built-in functions
    const functionContext: Record<string, (...args: unknown[]) => unknown> = {
      ...builtinFunctions,
    };

    // Replace function calls with their implementations
    // $if(cond, then, else) -> (cond ? then : else)
    expr = expr.replace(/\$if\((.*?), (.*?), (.*?)\)/g, '($1 ? $2 : $3)');

    // $concat(a, b, ...) -> (a + b + ...)
    expr = expr.replace(/\$concat\((.*?)\)/g, (_match, args) => {
      return args
        .split(',')
        .map((a: string) => a.trim())
        .join(' + ');
    });

    // $sum(field) - aggregate sum over array
    expr = expr.replace(/\$sum\((\w+)\)/g, (_match, field) => {
      const val = cleanRow[field];
      if (Array.isArray(val)) {
        return String(val.reduce((sum, v) => sum + (Number(v) || 0), 0));
      }
      return String(Number(val) || 0);
    });

    // $avg(field) - aggregate average over array
    expr = expr.replace(/\$avg\((\w+)\)/g, (_match, field) => {
      const val = cleanRow[field];
      if (Array.isArray(val) && val.length > 0) {
        return String(
          val.reduce((sum, v) => sum + (Number(v) || 0), 0) / val.length,
        );
      }
      return String(Number(val) || 0);
    });

    // $count(field) - count array items
    expr = expr.replace(/\$count\((\w+)\)/g, (_match, field) => {
      const val = cleanRow[field];
      if (Array.isArray(val)) {
        return String(val.length);
      }
      return '1';
    });

    // $round(value, decimals) - round to decimals
    expr = expr.replace(
      /\$round\((.*?),\s*(\d+)\)/g,
      (_match, value, decimals) => {
        return `Math.round(${value} * Math.pow(10, ${decimals})) / Math.pow(10, ${decimals})`;
      },
    );

    // $abs(value) - absolute value
    expr = expr.replace(/\$abs\((.*?)\)/g, 'Math.abs($1)');

    // $min(a, b) - minimum
    expr = expr.replace(/\$min\((.*?),\s*(.*?)\)/g, 'Math.min($1, $2)');

    // $max(a, b) - maximum
    expr = expr.replace(/\$max\((.*?),\s*(.*?)\)/g, 'Math.max($1, $2)');

    // $upper(str) - uppercase
    expr = expr.replace(/\$upper\((.*?)\)/g, '($1).toUpperCase()');

    // $lower(str) - lowercase
    expr = expr.replace(/\$lower\((.*?)\)/g, '($1).toLowerCase()');

    // $length(str/array) - length
    expr = expr.replace(/\$length\((.*?)\)/g, '($1).length');

    // Replace attribute names with values
    const tokens = expr
      .split(/([-+*/()<>!=&|?,\s]+)/)
      .filter((t) => t.trim().length > 0);
    for (const token of tokens) {
      if (
        /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token) &&
        !['true', 'false', 'null', 'undefined', 'Math'].includes(token)
      ) {
        const val = cleanRow[token];
        if (val !== undefined) {
          const stringified =
            typeof val === 'string'
              ? `"${val.replace(/"/g, '\\"')}"`
              : String(val);
          expr = expr.replace(new RegExp(`\\b${token}\\b`, 'g'), stringified);
        }
      }
    }

    // Safe evaluation
    return new Function(`return (${expr})`)();
  } catch (e) {
    console.warn(`Formula evaluation failed: ${formula}`, e);
    return undefined;
  }
}

/**
 * Evaluate multiple formulas against a row
 */
export function evaluateFormulas(
  formulas: Record<string, string>,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row };

  for (const [name, formula] of Object.entries(formulas)) {
    const value = evaluateFormula(formula, row);
    if (value !== undefined) {
      result[name] = value;
    }
  }

  return result;
}
