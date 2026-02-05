# Formula Field Support

**Status:** Complete
**Architecture:** Client-side evaluation with Vue reactivity
**Integration:** InstantDB schema storage

## Overview

Formula fields enable computed values in collections using JavaScript expressions. Formulas are:

- **Evaluated client-side** for real-time reactivity
- **Stored in schema** as plain strings in InstantDB
- **Type-safe** with optional return type hints
- **Helper-rich** with 25+ built-in functions

## Architecture

### Storage Layer

```typescript
// DatabaseField in instant.schema.ts settings
{
  id: string
  name: string
  type: 'formula'
  formula: string  // JavaScript expression
  formulaReturnType?: 'text' | 'number' | 'boolean' | 'date'
}
```

### Evaluation Engine

`useCollectionFormulas` composable provides:

- Safe expression evaluation with sandboxed context
- Helper function library (math, formatting, collections)
- Reactive recomputation on data changes
- Error handling with dev-mode feedback

### UI Integration

`DataTable/SchemaEditor.vue` includes:

- Formula field type in dropdown
- Multi-line expression editor
- Return type selector
- Helper function buttons

## Formula Syntax

### Basic JavaScript Expressions

```javascript
// Field references
fieldName;

// Math operations
budget - spent;

// Array methods
categories.reduce((sum, c) => sum + c.amount, 0);

// Ternary operators
status === 'active' ? 'Open' : 'Closed';
```

### Helper Functions

#### Array Operations

```javascript
$sum(...values); // Sum numbers
$avg(...values); // Average
$min(...values); // Minimum
$max(...values); // Maximum
$count(array); // Array length
```

#### Formatting

```javascript
$currency(1234.56); // "$1,234.56"
$percent(0.75); // "75.00%"
$date(timestamp); // "12/23/2024"
$round(3.14159, 2); // 3.14
```

#### String Operations

```javascript
$concat('Hello', ' ', 'World'); // "Hello World"
$upper(text); // "UPPERCASE"
$lower(text); // "lowercase"
$trim(text); // Remove whitespace
```

#### Collection Queries

```javascript
$filter((r) => r.status === 'active'); // Filter records
$find((r) => r.id === targetId); // Find first match
$map(array, (item) => item.name); // Transform array
$reduce(array, (acc, item) => acc + item.value, 0); // Reduce array
```

#### Conditional

```javascript
$if(condition, trueValue, falseValue); // Ternary helper
$switch(value, { a: 1, b: 2 }, 0); // Switch statement
```

#### Math

```javascript
$floor(3.7); // 3
$ceil(3.2); // 4
$abs(-5); // 5
```

## Real-World Examples

### Budget Tracking

```javascript
// Total budgeted across categories
categories.reduce((sum, c) => sum + c.budgeted, 0);

// Or with helper
$sum(...categories.map((c) => c.budgeted));

// Formatted currency
$currency($sum(...categories.map((c) => c.budgeted)));

// Budget utilization percentage
$percent(
  $sum(...categories.map((c) => c.spent)) /
    $sum(...categories.map((c) => c.budgeted)),
);

// Categories over budget
$count(categories.filter((c) => c.spent > c.budgeted));

// Budget status
$if(
  $sum(...categories.map((c) => c.spent)) >
    $sum(...categories.map((c) => c.budgeted)),
  'Over Budget',
  'Under Budget',
);
```

### Project Management

```javascript
// Completion percentage
$percent(completedTasks / totalTasks);

// Days until deadline
$round(($date(deadline) - $date(new Date())) / (1000 * 60 * 60 * 24));

// High-priority incomplete tasks
$count($filter((r) => r.priority === 'high' && !r.completed));

// Team workload
$avg(...team.map((member) => member.assignedTasks));
```

### Sales Analytics

```javascript
// Total revenue
$currency($sum(...sales.map((s) => s.amount)));

// Average deal size
$currency($avg(...sales.map((s) => s.amount)));

// Conversion rate
$percent(closedDeals / totalLeads);

// Top performer
$find((r) => r.revenue === $max(...$records.map((r) => r.revenue))).name;
```

## JSON-LD Integration

Formulas support JSON-LD `@expr` syntax:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "totalBudgeted": {
      "@id": "monetaryAmount",
      "@expr": "categories.reduce((sum, c) => sum + c.budgeted, 0)"
    }
  }
}
```

The evaluator automatically strips `@expr` wrappers:

```javascript
// Both work:
'categories.map(c => c.amount).reduce((a, b) => a + b, 0)';
'@expr: categories.map(c => c.amount).reduce((a, b) => a + b, 0)';
```

## Execution Context

Formulas have access to:

```typescript
{
  // Current record fields
  ...record,

  // All records in collection
  $records: Record[],
  $schema: DatabaseSchema,

  // Helper functions (25+ functions)
  $sum, $avg, $currency, $filter, etc.
}
```

## Performance Considerations

### Current Implementation (Client-Side)

- ✅ Real-time reactive updates
- ✅ Simple debugging
- ✅ No server dependency
- ⚠️ Re-evaluates on every Vue render
- ⚠️ Not queryable in InstantDB

### For Large Datasets (Future)

1. **Memoization** - Cache results until dependencies change
2. **Web Workers** - Move evaluation off main thread
3. **Lazy evaluation** - Only compute visible records
4. **Server-side** - When InstantDB adds cloud functions

## Testing

### Playground Component

`FormulaTestPlayground.vue` provides:

- Sample budget data (8 categories)
- 10 pre-built formula examples
- Custom formula tester
- Helper function reference
- Real-time evaluation

### Usage

```vue
<FormulaTestPlayground />
```

### Manual Testing

```typescript
const { evaluateSingleFormula } = useCollectionFormulas('collectionId');

const result = evaluateSingleFormula('$sum(100, 200, 300)', {
  /* context data */
});
// result: 600
```

## Error Handling

### Development Mode

Shows detailed error messages:

```
[Error: categories is not defined]
```

### Production Mode

Returns `null` and logs to console:

```javascript
console.error('Formula evaluation error in field "totalBudget":', error);
```

## Type Safety

### Formula Return Types

Specify expected result type for validation:

```typescript
{
  type: 'formula',
  formula: '$sum(...amounts)',
  formulaReturnType: 'number'  // Coerces result to number
}
```

Supported return types:

- `text` - Default, no coercion
- `number` - Converts to number
- `boolean` - Converts to boolean
- `date` - Converts to Date object

## Migration Path

### Phase 1 (✅ Complete)

- Type definitions with formula support
- Evaluation engine with 25+ helpers
- Schema editor UI with formula builder
- Test playground

### Phase 2 (Next)

- Dependency tracking for smart caching
- Formula validation before save
- Autocomplete in formula editor
- Visual formula builder (drag-drop)

### Phase 3 (Future)

- Server-side evaluation via InstantDB functions
- Queryable computed fields
- Cross-collection formulas
- SPARQL-like query language integration

## Security Considerations

### Sandboxing

Formulas run in `'use strict'` mode with limited context:

- No access to `window`, `document`, `localStorage`
- No access to `process`, `require`, `import`
- Only provided context + helper functions

### Input Validation

- User input is not directly `eval()`-ed
- Expressions wrapped in `Function()` constructor
- No dynamic code loading

### Best Practices

- Don't expose sensitive data in formula context
- Validate formula syntax before storage
- Limit formula complexity (max execution time)
- Monitor for infinite loops/recursion

## Comparison to Alternatives

### vs. Notion Formulas

- ✅ More powerful (full JavaScript)
- ✅ Helper functions included
- ✅ Real-time reactivity
- ⚠️ Requires JavaScript knowledge

### vs. Airtable Formulas

- ✅ No custom syntax to learn
- ✅ Array methods built-in
- ✅ Open-source extensible
- ⚠️ Client-side only (for now)

### vs. Excel Formulas

- ✅ Programmatic (map, filter, reduce)
- ✅ JSON/object manipulation
- ✅ Modern JavaScript features
- ⚠️ Different mental model

## Production Features

### ✅ Real-Time Validation

Formulas are validated as you type with:

- **Syntax checking** - Catches errors before saving
- **Visual feedback** - Green checkmark for valid, red alert for errors
- **Error messages** - Specific feedback on what went wrong
- **Loading indicator** - Shows validation in progress
- **Debounced execution** - Validates 500ms after typing stops

### ✅ Formula Templates Library

15+ pre-built templates in 4 categories:

**Budget & Finance**

- Total Sum - `$sum(...items.map(i => i.amount))`
- Budget Remaining - `$sum(...categories.map(c => c.budgeted - c.spent))`
- Currency Format - `$currency($sum(...items.map(i => i.price)))`
- Budget Utilization - `$percent($sum(...items.map(i => i.spent)) / $sum(...items.map(i => i.budgeted)))`

**Project Tracking**

- Completion Rate - `$percent(tasks.filter(t => t.completed).length / tasks.length)`
- Days Remaining - `$round(($date(deadline) - $date(new Date())) / (1000 * 60 * 60 * 24))`
- Overdue Tasks - `$count(tasks.filter(t => !t.completed && new Date(t.deadline) < new Date()))`

**Aggregations**

- Average Value - `$avg(...items.map(i => i.value))`
- Maximum/Minimum - `$max(...)` / `$min(...)`
- Count Items - `$count(items)`

**Conditionals**

- Status Labels with emojis
- Switch statements for multiple conditions
- Budget alerts

### ✅ Enhanced Helper Snippets

Organized by category for quick insertion:

- **Math** - Sum, Average
- **Array** - Count, Filter, Map
- **Format** - Currency, Percent, Round
- **Logic** - If/Else, Switch

Click "Templates" button to browse full library with descriptions.

## Next Steps

1. **DataTable Integration** - Show computed values (read-only display)
2. **Cross-Collection Lookups** - `$lookup()` helper for related data
3. **Memoization Layer** - Cache results for performance
4. **Dependency Tracking** - Smart recomputation only when needed
5. **Visual Formula Builder** - Drag-drop UI for non-coders
