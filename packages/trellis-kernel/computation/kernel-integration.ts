/**
 * Integration utilities for @expr evaluation with TrellisKernel
 * Provides helper functions to evaluate computed fields during data ingestion
 */

import { evaluateDocument, extractExprFields } from './expr-evaluator.js';
import { jsonEntityFacts, type Fact } from '../store/eav-store.js';

/**
 * Convert JSON entity to EAV facts, evaluating @expr fields first
 * This is the main integration point for LD-C computation in TrellisKernel
 */
export function jsonEntityFactsWithExpr(
  entityId: string,
  root: any,
  type: string,
  options?: {
    skipEvaluation?: boolean;
    evaluationContext?: Record<string, any>;
  },
): Fact[] {
  // If evaluation is disabled, use standard jsonEntityFacts
  if (options?.skipEvaluation) {
    return jsonEntityFacts(entityId, root, type);
  }

  // Check if there are any @expr fields to evaluate
  const exprFields = extractExprFields(root);

  if (Object.keys(exprFields).length === 0) {
    // No computed fields, use standard conversion
    return jsonEntityFacts(entityId, root, type);
  }

  // Evaluate all @expr fields in the document
  const evaluated = evaluateDocument(root, options?.evaluationContext);

  // Convert the evaluated document to facts
  return jsonEntityFacts(entityId, evaluated, type);
}

/**
 * Check if a JSON object contains any @expr fields
 */
export function hasExprFields(obj: any): boolean {
  const exprFields = extractExprFields(obj);
  return Object.keys(exprFields).length > 0;
}

/**
 * Extract all @expr field paths from a JSON object
 */
export function listExprFields(obj: any): string[] {
  const exprFields = extractExprFields(obj);
  return Object.keys(exprFields);
}

/**
 * Get the expression string for a specific field path
 */
export function getExprForField(obj: any, path: string): string | undefined {
  const exprFields = extractExprFields(obj);
  return exprFields[path];
}
