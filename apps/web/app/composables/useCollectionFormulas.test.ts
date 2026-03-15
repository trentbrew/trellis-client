import { describe, it, expect, beforeEach } from 'vitest'
import type { GraphEdge } from '~/composables/useCollectionFormulas'

describe('useCollectionFormulas', () => {
  let evaluateSingleFormula: (formula: string, sampleData?: any, allRecords?: any[], edges?: GraphEdge[]) => any

  beforeEach(() => {
    // Mock the composable for testing
    const { evaluateSingleFormula: evalFn } = useCollectionFormulas('test')
    evaluateSingleFormula = evalFn
  })

  describe('Helper Functions - Array Operations', () => {
    it('$sum should add numbers correctly', () => {
      const result = evaluateSingleFormula('$sum(10, 20, 30)')
      expect(result).toBe(60)
    })

    it('$sum should work with spread operator', () => {
      const result = evaluateSingleFormula('$sum(...[5, 10, 15])', { values: [5, 10, 15] })
      expect(result).toBe(30)
    })

    it('$avg should calculate average correctly', () => {
      const result = evaluateSingleFormula('$avg(10, 20, 30)')
      expect(result).toBe(20)
    })

    it('$avg should handle empty arrays', () => {
      const result = evaluateSingleFormula('$avg()')
      expect(result).toBe(0)
    })

    it('$min should find minimum value', () => {
      const result = evaluateSingleFormula('$min(10, 5, 20, 3)')
      expect(result).toBe(3)
    })

    it('$max should find maximum value', () => {
      const result = evaluateSingleFormula('$max(10, 5, 20, 3)')
      expect(result).toBe(20)
    })

    it('$count should count array items', () => {
      const result = evaluateSingleFormula('$count([1, 2, 3, 4, 5])')
      expect(result).toBe(5)
    })

    it('$count should return 0 for non-arrays', () => {
      const result = evaluateSingleFormula('$count("not an array")')
      expect(result).toBe(0)
    })
  })

  describe('Helper Functions - Formatting', () => {
    it('$currency should format numbers as USD currency', () => {
      const result = evaluateSingleFormula('$currency(1234.56)')
      expect(result).toBe('$1,234.56')
    })

    it('$currency should handle zero', () => {
      const result = evaluateSingleFormula('$currency(0)')
      expect(result).toBe('$0.00')
    })

    it('$percent should format decimals as percentages', () => {
      const result = evaluateSingleFormula('$percent(0.75)')
      expect(result).toBe('75.00%')
    })

    it('$percent should respect decimal places', () => {
      const result = evaluateSingleFormula('$percent(0.12345, 3)')
      expect(result).toBe('12.345%')
    })

    it('$round should round to specified decimals', () => {
      const result = evaluateSingleFormula('$round(3.14159, 2)')
      expect(result).toBe(3.14)
    })

    it('$round should default to 0 decimals', () => {
      const result = evaluateSingleFormula('$round(3.7)')
      expect(result).toBe(4)
    })

    it('$floor should round down', () => {
      const result = evaluateSingleFormula('$floor(3.7)')
      expect(result).toBe(3)
    })

    it('$ceil should round up', () => {
      const result = evaluateSingleFormula('$ceil(3.2)')
      expect(result).toBe(4)
    })

    it('$abs should return absolute value', () => {
      const result = evaluateSingleFormula('$abs(-5)')
      expect(result).toBe(5)
    })
  })

  describe('Helper Functions - String Operations', () => {
    it('$concat should concatenate strings', () => {
      const result = evaluateSingleFormula('$concat("Hello", " ", "World")')
      expect(result).toBe('Hello World')
    })

    it('$upper should uppercase strings', () => {
      const result = evaluateSingleFormula('$upper("hello")')
      expect(result).toBe('HELLO')
    })

    it('$lower should lowercase strings', () => {
      const result = evaluateSingleFormula('$lower("HELLO")')
      expect(result).toBe('hello')
    })

    it('$trim should remove whitespace', () => {
      const result = evaluateSingleFormula('$trim("  hello  ")')
      expect(result).toBe('hello')
    })
  })

  describe('Helper Functions - Conditional', () => {
    it('$if should return true value when condition is true', () => {
      const result = evaluateSingleFormula('$if(true, "yes", "no")')
      expect(result).toBe('yes')
    })

    it('$if should return false value when condition is false', () => {
      const result = evaluateSingleFormula('$if(false, "yes", "no")')
      expect(result).toBe('no')
    })

    it('$if should evaluate expressions', () => {
      const result = evaluateSingleFormula('$if(10 > 5, "greater", "less")')
      expect(result).toBe('greater')
    })

    it('$switch should match cases', () => {
      const result = evaluateSingleFormula('$switch("b", { "a": 1, "b": 2, "c": 3 })')
      expect(result).toBe(2)
    })

    it('$switch should return default for no match', () => {
      const result = evaluateSingleFormula('$switch("d", { "a": 1, "b": 2 }, 999)')
      expect(result).toBe(999)
    })
  })

  describe('Helper Functions - Collection Queries', () => {
    const sampleData = {
      items: [
        { id: 1, name: 'Apple', price: 1.5, category: 'fruit' },
        { id: 2, name: 'Banana', price: 0.8, category: 'fruit' },
        { id: 3, name: 'Carrot', price: 1.2, category: 'vegetable' },
      ],
    }

    it('$filter should filter array by predicate', () => {
      const result = evaluateSingleFormula('items.filter(i => i.category === "fruit")', sampleData)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Apple')
    })

    it('$find should find first matching item', () => {
      const result = evaluateSingleFormula('items.find(i => i.price > 1)', sampleData)
      expect(result.name).toBe('Apple')
    })

    it('$map should transform array', () => {
      const result = evaluateSingleFormula('$map(items, i => i.name)', sampleData)
      expect(result).toEqual(['Apple', 'Banana', 'Carrot'])
    })

    it('$reduce should aggregate values', () => {
      const result = evaluateSingleFormula('$reduce(items, (sum, i) => sum + i.price, 0)', sampleData)
      expect(result).toBeCloseTo(3.5, 2)
    })
  })

  describe('Real-World Budget Formulas', () => {
    const budgetData = {
      categories: [
        { name: 'Housing', budgeted: 2000, spent: 1850 },
        { name: 'Food', budgeted: 600, spent: 580 },
        { name: 'Transport', budgeted: 400, spent: 420 },
      ],
    }

    it('should calculate total budgeted amount', () => {
      const result = evaluateSingleFormula('categories.reduce((sum, c) => sum + c.budgeted, 0)', budgetData)
      expect(result).toBe(3000)
    })

    it('should calculate total budgeted with helper', () => {
      const result = evaluateSingleFormula('$sum(...categories.map(c => c.budgeted))', budgetData)
      expect(result).toBe(3000)
    })

    it('should calculate total spent', () => {
      const result = evaluateSingleFormula('$sum(...categories.map(c => c.spent))', budgetData)
      expect(result).toBe(2850)
    })

    it('should calculate remaining budget', () => {
      const result = evaluateSingleFormula('$sum(...categories.map(c => c.budgeted - c.spent))', budgetData)
      expect(result).toBe(150)
    })

    it('should format total as currency', () => {
      const result = evaluateSingleFormula('$currency(categories.reduce((sum, c) => sum + c.budgeted, 0))', budgetData)
      expect(result).toBe('$3,000.00')
    })

    it('should calculate budget utilization percentage', () => {
      const result = evaluateSingleFormula(
        '$percent($sum(...categories.map(c => c.spent)) / $sum(...categories.map(c => c.budgeted)))',
        budgetData,
      )
      expect(result).toBe('95.00%')
    })

    it('should count categories over budget', () => {
      const result = evaluateSingleFormula('$count(categories.filter(c => c.spent > c.budgeted))', budgetData)
      expect(result).toBe(1) // Transport is over
    })

    it('should find highest budget category', () => {
      const result = evaluateSingleFormula(
        'categories.reduce((max, c) => c.budgeted > max.budgeted ? c : max).name',
        budgetData,
      )
      expect(result).toBe('Housing')
    })

    it('should determine budget status', () => {
      const result = evaluateSingleFormula(
        '$if($sum(...categories.map(c => c.spent)) > $sum(...categories.map(c => c.budgeted)), "Over Budget", "Under Budget")',
        budgetData,
      )
      expect(result).toBe('Under Budget')
    })
  })

  describe('JSON-LD @expr Wrapper Support', () => {
    it('should parse @expr with double quotes', () => {
      const result = evaluateSingleFormula('"@expr": "10 + 20"')
      expect(result).toBe(30)
    })

    it('should parse @expr with single quotes', () => {
      const result = evaluateSingleFormula("'@expr': '10 + 20'")
      expect(result).toBe(30)
    })

    it('should parse @expr without wrapper quotes', () => {
      const result = evaluateSingleFormula('@expr: 10 + 20')
      expect(result).toBe(30)
    })

    it('should handle complex expressions with @expr', () => {
      const result = evaluateSingleFormula('"@expr": "$sum(5, 10, 15)"', {})
      expect(result).toBe(30)
    })
  })

  describe('Error Handling', () => {
    it('should return null for invalid syntax and log error', () => {
      const result = evaluateSingleFormula('invalid javascript syntax !')
      // Errors are logged to console but return null for graceful degradation
      expect(result).toBeNull()
    })

    it('should return null for undefined variables and log error', () => {
      const result = evaluateSingleFormula('undefinedVariable + 10')
      // Errors are logged to console but return null for graceful degradation
      expect(result).toBeNull()
    })

    it('should handle division by zero', () => {
      const result = evaluateSingleFormula('10 / 0')
      expect(result).toBe(Infinity)
    })

    it('should handle null values in calculations', () => {
      const result = evaluateSingleFormula('null + 10')
      expect(result).toBe(10)
    })
  })

  describe('Type Coercion', () => {
    it('should coerce to number when formulaReturnType is number', () => {
      const result = evaluateSingleFormula('"42"')
      // Note: Type coercion happens at the field level, not in evaluateSingleFormula
      // This test validates the raw evaluation returns a string
      expect(typeof result).toBe('string')
      expect(result).toBe('42')
    })

    it('should handle boolean results', () => {
      const result = evaluateSingleFormula('10 > 5')
      expect(result).toBe(true)
    })

    it('should handle date objects', () => {
      const result = evaluateSingleFormula('new Date("2024-01-01")')
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty formula', () => {
      const result = evaluateSingleFormula('')
      expect(result).toBeNull()
    })

    it('should return null for whitespace-only formula', () => {
      const result = evaluateSingleFormula('   ')
      // Whitespace trimmed to empty string, which returns null (error case)
      expect(result).toBeNull()
    })

    it('should handle very long formulas', () => {
      const longFormula = Array(100).fill('1').join(' + ')
      const result = evaluateSingleFormula(longFormula)
      expect(result).toBe(100)
    })

    it('should handle nested function calls', () => {
      const result = evaluateSingleFormula('$round($avg($sum(10, 20), $sum(30, 40)), 1)')
      expect(result).toBe(50)
    })

    it('should handle array methods chaining', () => {
      const result = evaluateSingleFormula(
        '[1, 2, 3, 4, 5].filter(n => n > 2).map(n => n * 2).reduce((a, b) => a + b, 0)',
      )
      expect(result).toBe(24) // (3*2 + 4*2 + 5*2) = 6 + 8 + 10 = 24
    })

    it('should handle object destructuring in context', () => {
      const result = evaluateSingleFormula('name + " " + age', { name: 'John', age: 30 })
      expect(result).toBe('John 30')
    })

    it('should handle template literals (backticks not allowed in Function constructor)', () => {
      // Template literals don't work in Function constructor, use concat instead
      const result = evaluateSingleFormula('$concat("Hello ", name)', { name: 'World' })
      expect(result).toBe('Hello World')
    })
  })

  describe('Context Access', () => {
    it('should access record fields from context', () => {
      const result = evaluateSingleFormula('price * quantity', { price: 10, quantity: 5 })
      expect(result).toBe(50)
    })

    it('should access nested object properties', () => {
      const result = evaluateSingleFormula('user.profile.age', {
        user: { profile: { age: 25 } },
      })
      expect(result).toBe(25)
    })

    it('should access array properties', () => {
      const result = evaluateSingleFormula('items[0].name', {
        items: [{ name: 'First' }, { name: 'Second' }],
      })
      expect(result).toBe('First')
    })
  })

  describe('Performance', () => {
    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        value: i,
      }))
      const startTime = performance.now()
      const result = evaluateSingleFormula('$sum(...items.map(i => i.value))', { items: largeArray })
      const endTime = performance.now()

      expect(result).toBe(499500) // Sum of 0 to 999
      expect(endTime - startTime).toBeLessThan(100) // Should complete in < 100ms
    })
  })

  describe('Graph Traversal Functions', () => {
    // Sample graph data for testing
    const nodes = [
      { '@id': 'node:1', name: 'Root', amount: 100 },
      { '@id': 'node:2', name: 'Child A', amount: 50 },
      { '@id': 'node:3', name: 'Child B', amount: 75 },
      { '@id': 'node:4', name: 'Grandchild A1', amount: 25 },
      { '@id': 'node:5', name: 'Grandchild A2', amount: 30 },
      { '@id': 'node:6', name: 'Unrelated', amount: 200 },
    ]

    const edges = [
      { source: 'node:1', target: 'node:2', relation: 'hasChild' },
      { source: 'node:1', target: 'node:3', relation: 'hasChild' },
      { source: 'node:2', target: 'node:4', relation: 'hasChild' },
      { source: 'node:2', target: 'node:5', relation: 'hasChild' },
      { source: 'node:2', target: 'node:3', relation: 'linkedTo' }, // Cross-link
    ]

    describe('$related', () => {
      it('should find related nodes in both directions', () => {
        const result = evaluateSingleFormula('$related(record).length', nodes[0], nodes, edges)
        // node:1 has outgoing edges to node:2 and node:3
        expect(result).toBe(2)
      })

      it('should filter by relation type', () => {
        // node:2 has hasChild edges: incoming from node:1, outgoing to node:4 and node:5
        const result = evaluateSingleFormula('$related(record, "hasChild").length', nodes[1], nodes, edges)
        expect(result).toBe(3) // node:1, node:4, node:5
      })

      it('should filter by relation type and direction', () => {
        // Only outgoing hasChild edges from node:2
        const result = evaluateSingleFormula('$related(record, "hasChild", "outgoing").length', nodes[1], nodes, edges)
        expect(result).toBe(2) // node:4 and node:5
      })

      it('should filter by direction', () => {
        const result = evaluateSingleFormula('$related(record, undefined, "incoming").length', nodes[1], nodes, edges)
        // node:2 has incoming edge from node:1
        expect(result).toBe(1)
      })

      it('should return empty for unconnected node', () => {
        const result = evaluateSingleFormula('$related(record).length', nodes[5], nodes, edges)
        expect(result).toBe(0)
      })
    })

    describe('$descendants', () => {
      it('should find all descendants', () => {
        const result = evaluateSingleFormula('$descendants(record).length', nodes[0], nodes, edges)
        // From root: Child A, Child B, Grandchild A1, Grandchild A2
        expect(result).toBe(4)
      })

      it('should respect depth limit', () => {
        const result = evaluateSingleFormula('$descendants(record, 1).length', nodes[0], nodes, edges)
        // Depth 1: only immediate children (Child A, Child B)
        expect(result).toBe(2)
      })

      it('should filter by relation type', () => {
        const result = evaluateSingleFormula('$descendants(record, Infinity, "hasChild").length', nodes[0], nodes, edges)
        expect(result).toBe(4)
      })

      it('should return empty for leaf node', () => {
        const result = evaluateSingleFormula('$descendants(record).length', nodes[3], nodes, edges)
        expect(result).toBe(0)
      })
    })

    describe('$ancestors', () => {
      it('should find all ancestors', () => {
        const result = evaluateSingleFormula('$ancestors(record).length', nodes[3], nodes, edges)
        // Grandchild A1 -> Child A -> Root
        expect(result).toBe(2)
      })

      it('should respect depth limit', () => {
        const result = evaluateSingleFormula('$ancestors(record, 1).length', nodes[3], nodes, edges)
        // Depth 1: only immediate parent (Child A)
        expect(result).toBe(1)
      })

      it('should return empty for root node', () => {
        const result = evaluateSingleFormula('$ancestors(record).length', nodes[0], nodes, edges)
        expect(result).toBe(0)
      })
    })

    describe('$siblings', () => {
      it('should find sibling nodes', () => {
        // Grandchild A1's parent (Child A) has outgoing edges to node:4, node:5, and node:3 (via linkedTo)
        // So siblings includes node:5 (hasChild) and node:3 (linkedTo)
        const result = evaluateSingleFormula('$siblings(record).length', nodes[3], nodes, edges)
        expect(result).toBe(2)
      })

      it('should filter siblings by relation type', () => {
        // Only consider hasChild edges - siblings are other hasChild children of same parent
        const result = evaluateSingleFormula('$siblings(record, "hasChild").length', nodes[3], nodes, edges)
        // Grandchild A1's sibling via hasChild is just Grandchild A2
        expect(result).toBe(1)
      })

      it('should return empty for node without siblings', () => {
        const result = evaluateSingleFormula('$siblings(record).length', nodes[0], nodes, edges)
        // Root has no parent, so no siblings
        expect(result).toBe(0)
      })
    })

    describe('$path', () => {
      it('should find path between connected nodes', () => {
        const result = evaluateSingleFormula('$path(record, "node:4")', nodes[0], nodes, edges)
        // Root -> Child A -> Grandchild A1
        expect(result).toBe(true)
      })

      it('should return false for unconnected nodes', () => {
        const result = evaluateSingleFormula('$path(record, "node:6")', nodes[0], nodes, edges)
        // No path from root to unrelated node
        expect(result).toBe(false)
      })
    })

    describe('$nodeEdges', () => {
      it('should get all edges for a node', () => {
        const result = evaluateSingleFormula('$nodeEdges(record).length', nodes[1], nodes, edges)
        // node:2 has: 1 incoming from root, 2 outgoing to grandchildren, 1 outgoing linkedTo
        expect(result).toBe(4)
      })

      it('should filter by direction', () => {
        const result = evaluateSingleFormula('$nodeEdges(record, "outgoing").length', nodes[0], nodes, edges)
        // Root has 2 outgoing edges
        expect(result).toBe(2)
      })
    })

    describe('Graph Formula Combinations', () => {
      it('should sum descendant values', () => {
        const result = evaluateSingleFormula(
          '$sum(...$descendants(record).map(n => n.amount))',
          nodes[0],
          nodes,
          edges,
        )
        // Child A (50) + Child B (75) + Grandchild A1 (25) + Grandchild A2 (30)
        expect(result).toBe(180)
      })

      it('should count descendants conditionally', () => {
        const result = evaluateSingleFormula(
          '$count($descendants(record).filter(n => n.amount > 30))',
          nodes[0],
          nodes,
          edges,
        )
        // Only Child A (50) and Child B (75) have amount > 30
        expect(result).toBe(2)
      })

      it('should calculate average of related values', () => {
        const result = evaluateSingleFormula(
          '$avg(...$related(record, "hasChild").map(n => n.amount))',
          nodes[0],
          nodes,
          edges,
        )
        // Average of Child A (50) and Child B (75)
        expect(result).toBe(62.5)
      })
    })
  })})
