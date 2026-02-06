/**
 * Built-in functions for @expr evaluation
 * Provides utility functions for common operations in LD-C expressions
 */

export type BuiltinFunction = (...args: any[]) => any;

export interface BuiltinFunctionRegistry {
  [name: string]: BuiltinFunction;
}

/**
 * Math functions
 */
export const mathFunctions: BuiltinFunctionRegistry = {
  $round: (value: number, decimals: number = 0): number => {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  },

  $abs: (value: number): number => Math.abs(value),

  $min: (...values: number[]): number => Math.min(...values),

  $max: (...values: number[]): number => Math.max(...values),

  $sum: (values: number[]): number => {
    if (!Array.isArray(values)) return 0;
    return values.reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
  },

  $avg: (values: number[]): number => {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sum = values.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    return sum / values.length;
  },

  $floor: (value: number): number => Math.floor(value),

  $ceil: (value: number): number => Math.ceil(value),

  $pow: (base: number, exponent: number): number => Math.pow(base, exponent),

  $sqrt: (value: number): number => Math.sqrt(value),
};

/**
 * String functions
 */
export const stringFunctions: BuiltinFunctionRegistry = {
  $upper: (str: string): string => String(str).toUpperCase(),

  $lower: (str: string): string => String(str).toLowerCase(),

  $concat: (...parts: any[]): string => {
    return parts.map((p) => String(p ?? '')).join('');
  },

  $length: (value: string | any[]): number => {
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    return 0;
  },

  $trim: (str: string): string => String(str).trim(),

  $split: (str: string, delimiter: string): string[] => {
    return String(str).split(delimiter);
  },

  $join: (array: any[], delimiter: string = ''): string => {
    if (!Array.isArray(array)) return '';
    return array.map((item) => String(item ?? '')).join(delimiter);
  },
};

/**
 * Conditional logic functions
 */
export const logicFunctions: BuiltinFunctionRegistry = {
  $if: (condition: any, thenValue: any, elseValue: any): any => {
    return condition ? thenValue : elseValue;
  },

  $switch: (
    value: any,
    cases: Record<string, any>,
    defaultValue?: any,
  ): any => {
    const key = String(value);
    return cases.hasOwnProperty(key) ? cases[key] : defaultValue;
  },

  $coalesce: (...values: any[]): any => {
    for (const v of values) {
      if (v !== null && v !== undefined) return v;
    }
    return null;
  },
};

/**
 * Date/time functions
 */
export const dateFunctions: BuiltinFunctionRegistry = {
  $now: (): Date => new Date(),

  $dateDiff: (
    date1: Date | string,
    date2: Date | string,
    unit: string = 'ms',
  ): number => {
    const d1 = date1 instanceof Date ? date1 : new Date(date1);
    const d2 = date2 instanceof Date ? date2 : new Date(date2);
    const diff = d1.getTime() - d2.getTime();

    switch (unit) {
      case 'ms':
        return diff;
      case 's':
        return diff / 1000;
      case 'm':
        return diff / (1000 * 60);
      case 'h':
        return diff / (1000 * 60 * 60);
      case 'd':
        return diff / (1000 * 60 * 60 * 24);
      default:
        return diff;
    }
  },

  $formatDate: (date: Date | string, format: string = 'ISO'): string => {
    const d = date instanceof Date ? date : new Date(date);

    if (format === 'ISO') return d.toISOString();
    if (format === 'date') return d.toISOString().split('T')[0] ?? '';
    if (format === 'time')
      return d.toISOString().split('T')[1]?.split('.')[0] ?? '';
    if (format === 'locale') return d.toLocaleDateString();

    return d.toISOString();
  },
};

/**
 * Utility functions
 */
export const utilityFunctions: BuiltinFunctionRegistry = {
  $currency: (
    value: number,
    currency: string = 'USD',
    decimals: number = 2,
  ): string => {
    const formatted = value.toFixed(decimals);
    return `${currency} ${formatted}`;
  },

  $percent: (value: number, decimals: number = 1): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  $convert: (value: any, targetUnit: string): any => {
    // Simple unit conversion for common cases
    // In production, this would use a more sophisticated unit library
    if (typeof value === 'number') {
      return value; // Placeholder - actual conversion logic would go here
    }
    return value;
  },

  $type: (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  },

  $keys: (obj: Record<string, any>): string[] => {
    return Object.keys(obj ?? {});
  },

  $values: (obj: Record<string, any>): any[] => {
    return Object.values(obj ?? {});
  },
};

/**
 * Array functions
 */
export const arrayFunctions: BuiltinFunctionRegistry = {
  $first: (array: any[]): any => {
    return Array.isArray(array) && array.length > 0 ? array[0] : null;
  },

  $last: (array: any[]): any => {
    return Array.isArray(array) && array.length > 0
      ? array[array.length - 1]
      : null;
  },

  $slice: (array: any[], start: number, end?: number): any[] => {
    if (!Array.isArray(array)) return [];
    return array.slice(start, end);
  },

  $reverse: (array: any[]): any[] => {
    if (!Array.isArray(array)) return [];
    return [...array].reverse();
  },

  $sort: (array: any[], key?: string): any[] => {
    if (!Array.isArray(array)) return [];
    const sorted = [...array];

    if (key) {
      sorted.sort((a, b) => {
        const aVal = a?.[key];
        const bVal = b?.[key];
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    } else {
      sorted.sort();
    }

    return sorted;
  },
};

/**
 * Combined registry of all built-in functions
 */
export const builtinFunctions: BuiltinFunctionRegistry = {
  ...mathFunctions,
  ...stringFunctions,
  ...logicFunctions,
  ...dateFunctions,
  ...utilityFunctions,
  ...arrayFunctions,
};

/**
 * Check if a function name is a built-in function
 */
export function isBuiltinFunction(name: string): boolean {
  return name in builtinFunctions;
}

/**
 * Get a built-in function by name
 */
export function getBuiltinFunction(name: string): BuiltinFunction | undefined {
  return builtinFunctions[name];
}

/**
 * List all available built-in functions
 */
export function listBuiltinFunctions(): string[] {
  return Object.keys(builtinFunctions);
}
