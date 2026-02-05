# Formula Production Features 🚀

**Status:** Production-Ready
**Version:** 1.0.0
**Last Updated:** December 23, 2024

## What's New

### 1. Real-Time Formula Validation ✅

**Problem Solved:** Users could save broken formulas that would silently fail at runtime.

**Solution:** Instant syntax checking with visual feedback.

**Features:**

- ⚡ **Live validation** as you type (500ms debounce)
- ✅ **Green checkmark** when formula is valid
- 🚨 **Red error indicator** with specific error message
- 🔄 **Loading spinner** during validation
- 🧪 **Test context** - Validates against sample data

**Example Error Messages:**

```
❌ "Formula returned null - check syntax"
❌ "Unexpected identifier 'javascript'"
❌ "undefinedVariable is not defined"
```

**Code Location:** `SchemaEditor.vue:30-60`

---

### 2. Formula Templates Library 📚

**Problem Solved:** Users had to write formulas from scratch without examples.

**Solution:** 15+ production-ready templates across 4 categories.

#### Budget & Finance

```javascript
// Total Sum
$sum(...items.map((i) => i.amount));

// Budget Remaining
$sum(...categories.map((c) => c.budgeted - c.spent));

// Currency Format
$currency($sum(...items.map((i) => i.price)));

// Budget Utilization %
$percent(
  $sum(...items.map((i) => i.spent)) / $sum(...items.map((i) => i.budgeted)),
);
```

#### Project Tracking

```javascript
// Completion Rate
$percent(tasks.filter((t) => t.completed).length / tasks.length);

// Days Remaining
$round(($date(deadline) - $date(new Date())) / (1000 * 60 * 60 * 24));

// Overdue Tasks
$count(tasks.filter((t) => !t.completed && new Date(t.deadline) < new Date()));
```

#### Aggregations

```javascript
$avg(...items.map((i) => i.value)); // Average
$max(...items.map((i) => i.value)); // Maximum
$min(...items.map((i) => i.value)); // Minimum
$count(items); // Count
```

#### Conditionals

```javascript
// Status Label
$if(completed, 'Done', 'In Progress');

// Multiple Conditions (with emojis)
$switch(
  status,
  {
    draft: '📝',
    review: '👀',
    done: '✅',
  },
  '❓',
);

// Budget Alert
$if(spent > budgeted, '⚠️ Over Budget', '✅ On Track');
```

**UI Location:** Click "Templates" button (sparkles icon) in formula editor

**Code Location:** `SchemaEditor.vue:63-154`

---

### 3. Enhanced Helper Snippets 🎯

**Problem Solved:** Helper buttons were unlabeled and hard to browse.

**Solution:** Categorized quick-insert buttons with better UX.

#### Categories

**Math**

- `$sum(field1, field2)` - Sum
- `$avg(field1, field2)` - Average

**Array**

- `$count(array)` - Count
- `items.filter(i => i.active)` - Filter
- `items.map(i => i.name)` - Map

**Format**

- `$currency(value)` - Currency
- `$percent(value)` - Percent
- `$round(value, 2)` - Round

**Logic**

- `$if(condition, true, false)` - If/Else
- `$switch(value, {a: 1}, 0)` - Switch

**Features:**

- Monospace font for code clarity
- Visual category grouping
- One-click insertion (appends to existing formula)
- Auto-validation after insertion

**Code Location:** `SchemaEditor.vue:156-167, 375-394`

---

## User Experience Flow

### Creating a Formula Field

1. **Add Field** → Select "Formula" type
2. **Click "Templates"** → Browse 15+ pre-built examples
3. **Select Template** → Auto-populates with working code
4. **Customize** → Modify field names to match your schema
5. **See Validation** → Green checkmark = ready to save

### Error Handling

```
User types: "invalid syntax !"
    ↓
⏱️  Debounce 500ms
    ↓
🔄 Loading indicator appears
    ↓
❌ Red border + error message:
   "Unexpected identifier 'syntax'"
    ↓
User fixes → Types: "$sum(10, 20)"
    ↓
✅ Green checkmark: "Valid formula"
```

---

## Testing

All validation logic is unit tested:

```bash
# Run formula validation tests
npm run test -- tests/composables/useCollectionFormulas.test.ts
```

**Test Coverage:**

- ✅ Valid formulas pass validation
- ✅ Invalid syntax shows error messages
- ✅ Empty formulas don't show errors
- ✅ Helpers insert correctly
- ✅ Templates apply successfully

---

## Performance

### Validation Performance

- **Debounced:** 500ms delay prevents excessive validation
- **Async:** Non-blocking UI during validation
- **Lightweight:** Test context with minimal sample data

### Template Performance

- **Zero overhead** - Templates are static arrays
- **Lazy rendering** - Panel only renders when opened
- **Instant insertion** - Direct string replacement

---

## Architecture Decisions

### Why Client-Side Validation?

- ✅ Instant feedback (no server round-trip)
- ✅ Works offline
- ✅ Leverages existing evaluation engine
- ✅ Consistent with runtime behavior

### Why Template Library?

- ✅ Reduces learning curve
- ✅ Promotes best practices
- ✅ Speeds up formula authoring
- ✅ Provides working examples

### Why Categorized Helpers?

- ✅ Easier to scan
- ✅ Teaches formula structure
- ✅ Reduces cognitive load
- ✅ Professional UX

---

## Future Enhancements

### Short-Term (Next Sprint)

1. ~~**DataTable Integration**~~ ✅ Complete!
2. **Formula Tooltips** - Hover to see helper function docs
3. **Autocomplete** - Suggest field names and helpers

### Medium-Term

4. **Cross-Collection Lookups** - `$lookup('projects', filter)`
5. **Custom Helper Functions** - User-defined reusable functions
6. **Formula Versioning** - Track changes over time

### Long-Term (SvelteKit Migration)

7. **Visual Formula Builder** - Drag-drop blocks
8. **Formula Blocks** - First-class Trellis projection type
9. **Server-Side Evaluation** - When InstantDB adds cloud functions

---

## Migration to SvelteKit

These features transfer **cleanly** to SvelteKit:

```typescript
// Vue computed → Svelte $derived
let isValid = $derived(validateFormula(formula));

// Vue ref → Svelte $state
let showTemplates = $state(false);

// Templates array stays identical
const formulaTemplates = [
  /* same */
];

// Evaluation engine unchanged
const result = evaluateSingleFormula(formula, context);
```

**No rewrite needed** - just syntax updates.

---

## API Reference

### `validateFormula(fieldId, formula)`

Validates a formula expression.

**Parameters:**

- `fieldId: string` - Field identifier for tracking
- `formula: string` - Formula expression to validate

**Returns:** Sets `formulaErrors[fieldId]` to error message or `null`

**Side Effects:**

- Updates `validatingFormulas[fieldId]` during execution
- Tests against sample data context

### `insertTemplate(fieldId, template)`

Inserts a pre-built template into formula field.

**Parameters:**

- `fieldId: string` - Target field identifier
- `template: TemplateObject` - Template with name, description, code

**Side Effects:**

- Replaces current formula
- Triggers validation
- Closes template panel

### `insertHelper(fieldId, code)`

Appends helper snippet to existing formula.

**Parameters:**

- `fieldId: string` - Target field identifier
- `code: string` - Helper code snippet

**Side Effects:**

- Appends to current formula with newline
- Triggers validation

---

## Troubleshooting

### Validation Stuck on Loading

**Cause:** Formula contains infinite loop
**Fix:** Check for recursive operations

### Template Doesn't Work

**Cause:** Field names don't match schema
**Fix:** Customize field references (e.g., `items` → `tasks`)

### Helper Inserts Wrong Place

**Cause:** Cursor position not at end
**Fix:** Currently appends - manual positioning needed

---

## Credits

- **Evaluation Engine:** `useCollectionFormulas` composable
- **UI Components:** shadcn/ui + Radix Vue
- **Icons:** Lucide Icons
- **Validation:** Real-time syntax checking with sample context

Built for production by the Trellis team 🎯
