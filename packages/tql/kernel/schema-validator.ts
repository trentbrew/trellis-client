/**
 * Schema Validator — validates plain objects against SchemaDefinition contracts.
 *
 * Used by tests to ensure InstantDB records conform to the core ontology spec.
 * Pure functions, no side effects, no database access.
 */

import type { SchemaDefinition, PropertyValueSpecification } from './workspace.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a plain object against a SchemaDefinition.
 *
 * Checks:
 * - Required fields are present and non-null
 * - Select fields have values within selectOptions (if defined)
 * - Checkbox fields are boolean
 * - Number fields are numeric
 */
export function validateAgainstSchema(
  data: Record<string, unknown>,
  schema: SchemaDefinition,
): ValidationResult {
  const errors: string[] = [];

  for (const field of schema.fields) {
    const value = data[field.name];

    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field: ${field.name}`);
      continue;
    }

    // Skip further validation if value is absent and not required
    if (value === undefined || value === null) continue;

    // Select enum check
    if (field.valueType === 'select' && field.selectOptions) {
      if (!field.selectOptions.includes(value as string)) {
        errors.push(
          `Invalid value for ${field.name}: "${value}". ` +
          `Must be one of: ${field.selectOptions.join(', ')}`,
        );
      }
    }

    // Checkbox type check
    if (field.valueType === 'checkbox' && typeof value !== 'boolean') {
      errors.push(`Field ${field.name} must be boolean, got ${typeof value}`);
    }

    // Number type check
    if (field.valueType === 'number' && typeof value !== 'number') {
      errors.push(`Field ${field.name} must be number, got ${typeof value}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extracts the allowed values for a select field from a schema.
 * Returns undefined if the field doesn't exist or isn't a select.
 */
export function getSelectOptions(
  schema: SchemaDefinition,
  fieldName: string,
): string[] | undefined {
  const field = schema.fields.find((f) => f.name === fieldName);
  if (!field || field.valueType !== 'select') return undefined;
  return field.selectOptions as string[] | undefined;
}

/**
 * Extracts the default value for a field from a schema.
 */
export function getFieldDefault(
  schema: SchemaDefinition,
  fieldName: string,
): unknown {
  const field = schema.fields.find((f) => f.name === fieldName);
  return field?.defaultValue;
}

/**
 * Returns all required field names from a schema.
 */
export function getRequiredFields(schema: SchemaDefinition): string[] {
  return schema.fields
    .filter((f) => f.required)
    .map((f) => f.name);
}

/**
 * Checks if a schema defines a specific field.
 */
export function hasField(schema: SchemaDefinition, fieldName: string): boolean {
  return schema.fields.some((f) => f.name === fieldName);
}
