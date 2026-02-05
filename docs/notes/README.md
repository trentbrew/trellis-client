# Formula Field Testing Suite

Comprehensive test coverage for formula evaluation engine and UI components.

## Test Structure

```
tests/
├── composables/
│   └── useCollectionFormulas.test.ts    # Unit tests for formula engine
├── components/
│   └── SchemaEditor.test.ts             # Component tests for schema editor
├── e2e/
│   └── formula-fields.spec.ts           # End-to-end Playwright tests
└── README.md                             # This file
```

## Running Tests

### All Tests

```bash
npm run test
```

### Unit Tests Only

```bash
npm run test -- tests/composables
npm run test -- tests/components
```

### E2E Tests Only

```bash
npx playwright test tests/e2e/formula-fields.spec.ts
```

### Watch Mode

```bash
npm run test -- --watch
```

### Coverage Report

```bash
npm run test -- --coverage
```

## Test Coverage

### Unit Tests (`useCollectionFormulas.test.ts`)

**Helper Functions - Array Operations** (8 tests)

- ✅ `$sum` basic addition
- ✅ `$sum` with spread operator
- ✅ `$avg` average calculation
- ✅ `$avg` empty array handling
- ✅ `$min` minimum value
- ✅ `$max` maximum value
- ✅ `$count` array counting
- ✅ `$count` non-array handling

**Helper Functions - Formatting** (9 tests)

- ✅ `$currency` USD formatting
- ✅ `$currency` zero handling
- ✅ `$percent` percentage formatting
- ✅ `$percent` decimal precision
- ✅ `$round` decimal rounding
- ✅ `$round` default decimals
- ✅ `$floor` round down
- ✅ `$ceil` round up
- ✅ `$abs` absolute value

**Helper Functions - String Operations** (4 tests)

- ✅ `$concat` string concatenation
- ✅ `$upper` uppercase transformation
- ✅ `$lower` lowercase transformation
- ✅ `$trim` whitespace removal

**Helper Functions - Conditional** (5 tests)

- ✅ `$if` true condition
- ✅ `$if` false condition
- ✅ `$if` expression evaluation
- ✅ `$switch` case matching
- ✅ `$switch` default value

**Helper Functions - Collection Queries** (4 tests)

- ✅ `$filter` array filtering
- ✅ `$find` first match finding
- ✅ `$map` array transformation
- ✅ `$reduce` value aggregation

**Real-World Budget Formulas** (9 tests)

- ✅ Total budgeted calculation
- ✅ Total budgeted with helpers
- ✅ Total spent calculation
- ✅ Remaining budget calculation
- ✅ Currency formatting
- ✅ Budget utilization percentage
- ✅ Over-budget category count
- ✅ Highest budget category
- ✅ Budget status determination

**JSON-LD @expr Wrapper Support** (4 tests)

- ✅ Double quote wrapper parsing
- ✅ Single quote wrapper parsing
- ✅ No wrapper quotes parsing
- ✅ Complex expressions with @expr

**Error Handling** (4 tests)

- ✅ Invalid syntax error messages
- ✅ Undefined variable handling
- ✅ Division by zero
- ✅ Null value calculations

**Type Coercion** (3 tests)

- ✅ Number type coercion
- ✅ Boolean results
- ✅ Date object handling

**Edge Cases** (8 tests)

- ✅ Empty formula
- ✅ Whitespace-only formula
- ✅ Very long formulas
- ✅ Nested function calls
- ✅ Array method chaining
- ✅ Object destructuring
- ✅ Template literal alternatives
- ✅ Context field access

**Context Access** (3 tests)

- ✅ Record field access
- ✅ Nested object properties
- ✅ Array element access

**Performance** (1 test)

- ✅ Large array efficiency (1000 elements < 100ms)

**Total Unit Tests: 62**

### Component Tests (`SchemaEditor.test.ts`)

**Field Type Selection** (2 tests)

- ✅ Formula type in dropdown
- ✅ All expected field types present

**Formula Field UI** (3 tests)

- ✅ Formula editor visibility
- ✅ Formula helper buttons
- ✅ Helper code insertion

**Field CRUD Operations** (3 tests)

- ✅ Add new field
- ✅ Update field properties
- ✅ Delete field

**Formula Field Updates** (2 tests)

- ✅ Update formula expression
- ✅ Update formula return type

**Empty State** (1 test)

- ✅ Empty state display

**Total Component Tests: 11**

### E2E Tests (`formula-fields.spec.ts`)

**Formula Playground** (9 tests)

- ✅ Playground page load
- ✅ Sample data display
- ✅ Pre-built formula evaluation
- ✅ Custom formula real-time evaluation
- ✅ Error handling
- ✅ Helper reference display
- ✅ Budget formula accuracy
- ✅ Currency formatting
- ✅ Percentage calculations
- ✅ Complex nested formulas

**Schema Editor Integration** (2 tests - skipped pending setup)

- ⏭️ Add formula field to schema
- ⏭️ Insert helper functions

**Total E2E Tests: 11 (9 active, 2 skipped)**

## Test Scenarios Covered

### Formula Evaluation Engine

- ✅ Basic arithmetic operations
- ✅ Array operations (map, filter, reduce)
- ✅ String manipulation
- ✅ Conditional logic
- ✅ Helper function library (25+ functions)
- ✅ Nested and complex expressions
- ✅ Error handling and edge cases
- ✅ Performance with large datasets

### JSON-LD Integration

- ✅ `@expr` wrapper parsing (all quote styles)
- ✅ Expression extraction from JSON-LD context
- ✅ Compatibility with semantic layer

### UI Components

- ✅ Schema editor formula field UI
- ✅ Helper button insertion
- ✅ Return type selection
- ✅ Field CRUD operations
- ✅ Real-time formula playground

### Real-World Use Cases

- ✅ Budget tracking calculations
- ✅ Financial formatting (currency, percentages)
- ✅ Data aggregation and analysis
- ✅ Conditional business logic
- ✅ Cross-field calculations

## Test Data

### Sample Budget Data

```javascript
{
  categories: [
    { name: 'Housing', budgeted: 2000, spent: 1850 },
    { name: 'Food', budgeted: 600, spent: 580 },
    { name: 'Transportation', budgeted: 400, spent: 420 },
    { name: 'Entertainment', budgeted: 200, spent: 150 },
    { name: 'Utilities', budgeted: 300, spent: 280 },
    { name: 'Savings', budgeted: 500, spent: 500 },
    { name: 'Healthcare', budgeted: 250, spent: 180 },
    { name: 'Misc', budgeted: 150, spent: 120 },
  ];
}
```

### Sample Product Data

```javascript
{
  items: [
    { id: 1, name: 'Apple', price: 1.5, category: 'fruit' },
    { id: 2, name: 'Banana', price: 0.8, category: 'fruit' },
    { id: 3, name: 'Carrot', price: 1.2, category: 'vegetable' },
  ];
}
```

## Assertions

Tests verify:

1. **Correctness** - Formulas produce expected results
2. **Type Safety** - Return types match expectations
3. **Error Handling** - Graceful degradation on errors
4. **Performance** - Large datasets complete < 100ms
5. **UI Behavior** - Components render and update correctly
6. **Integration** - Formula engine works with schema storage

## Coverage Goals

- **Unit Tests:** >90% code coverage
- **Component Tests:** All user interactions
- **E2E Tests:** Critical user workflows
- **Edge Cases:** All error conditions

## Adding New Tests

### Unit Test Template

```typescript
it('should [expected behavior]', () => {
  const result = evaluateSingleFormula('[formula]', [context]);
  expect(result).toBe([expected]);
});
```

### Component Test Template

```typescript
it('should [user action]', () => {
  wrapper.vm.[method]([params])
  expect(wrapper.emitted('[event]')).toBeTruthy()
})
```

### E2E Test Template

```typescript
test('should [workflow]', async ({ page }) => {
  await page.goto('[url]');
  await page.locator('[selector]').click();
  await expect(page.locator('[result]')).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically on:

- ✅ Every commit (unit + component tests)
- ✅ Pull requests (full suite)
- ✅ Pre-deployment (E2E tests)

## Known Limitations

1. **Template Literals** - Not supported in Function constructor (use `$concat` instead)
2. **Async Operations** - Formulas are synchronous only
3. **Browser APIs** - No access to DOM, window, or storage APIs
4. **Import Statements** - Cannot import external modules

## Future Test Additions

- [ ] Dependency tracking tests
- [ ] Formula validation before save
- [ ] Autocomplete functionality tests
- [ ] Visual formula builder tests
- [ ] Server-side evaluation tests (when available)
- [ ] Cross-collection formula tests
- [ ] SPARQL integration tests
- [ ] Memory leak tests for long-running evaluations
