export type BudgetGraphNode = {
  '@id': string
  type: string
  name: string
  amount?: number
  balance?: number
  period?: string
}

export type BudgetGraphEdge = {
  '@id'?: string
  source: string
  target: string
  relation: string
  properties?: Record<string, unknown>
}

export const budgetGraphDemo = {
  nodes: [
    // Accounts
    { '@id': 'account:checking', type: 'Account', name: 'Checking Account', balance: 3200 },
    { '@id': 'account:savings', type: 'Account', name: 'Savings Account', balance: 8500 },
    { '@id': 'account:credit', type: 'Account', name: 'Credit Card', balance: -420 },

    // Categories (hierarchy)
    { '@id': 'cat:housing', type: 'Category', name: 'Housing' },
    { '@id': 'cat:rent', type: 'Category', name: 'Rent' },
    { '@id': 'cat:utilities', type: 'Category', name: 'Utilities' },
    { '@id': 'cat:food', type: 'Category', name: 'Food' },
    { '@id': 'cat:groceries', type: 'Category', name: 'Groceries' },
    { '@id': 'cat:dining', type: 'Category', name: 'Dining Out' },
    { '@id': 'cat:transport', type: 'Category', name: 'Transport' },
    { '@id': 'cat:fuel', type: 'Category', name: 'Fuel' },
    { '@id': 'cat:transit', type: 'Category', name: 'Transit' },

    // Budgets (monthly)
    { '@id': 'budget:rent', type: 'Budget', name: 'Rent Budget', amount: 2000, period: 'monthly' },
    { '@id': 'budget:utilities', type: 'Budget', name: 'Utilities Budget', amount: 300, period: 'monthly' },
    { '@id': 'budget:groceries', type: 'Budget', name: 'Groceries Budget', amount: 450, period: 'monthly' },
    { '@id': 'budget:dining', type: 'Budget', name: 'Dining Budget', amount: 200, period: 'monthly' },
    { '@id': 'budget:fuel', type: 'Budget', name: 'Fuel Budget', amount: 180, period: 'monthly' },
    { '@id': 'budget:transit', type: 'Budget', name: 'Transit Budget', amount: 120, period: 'monthly' },

    // Goals
    { '@id': 'goal:emergency', type: 'Goal', name: 'Emergency Fund', amount: 10000 },
    { '@id': 'goal:vacation', type: 'Goal', name: 'Vacation Fund', amount: 2500 },

    // Payees
    { '@id': 'payee:landlord', type: 'Payee', name: 'Downtown Properties' },
    { '@id': 'payee:utility', type: 'Payee', name: 'City Utilities' },
    { '@id': 'payee:grocery', type: 'Payee', name: 'Fresh Market' },
    { '@id': 'payee:restaurant', type: 'Payee', name: 'Bistro 44' },
    { '@id': 'payee:fuel', type: 'Payee', name: 'Fuel Stop' },
    { '@id': 'payee:transit', type: 'Payee', name: 'Metro Transit' },

    // Transactions (positive amounts = outflow)
    { '@id': 'tx:rent-jan', type: 'Transaction', name: 'January Rent', amount: 2000 },
    { '@id': 'tx:utilities-jan', type: 'Transaction', name: 'Utilities - January', amount: 250 },
    { '@id': 'tx:groceries-1', type: 'Transaction', name: 'Groceries - Week 1', amount: 140 },
    { '@id': 'tx:groceries-2', type: 'Transaction', name: 'Groceries - Week 2', amount: 125 },
    { '@id': 'tx:dining-1', type: 'Transaction', name: 'Dinner Out', amount: 65 },
    { '@id': 'tx:fuel-1', type: 'Transaction', name: 'Fuel Fill-up', amount: 70 },
    { '@id': 'tx:transit-1', type: 'Transaction', name: 'Monthly Transit Pass', amount: 110 },
    { '@id': 'tx:groceries-3', type: 'Transaction', name: 'Groceries - Week 3', amount: 135 },
    { '@id': 'tx:dining-2', type: 'Transaction', name: 'Lunch Out', amount: 28 },
    { '@id': 'tx:savings-transfer', type: 'Transaction', name: 'Transfer to Savings', amount: 500 },
  ] satisfies BudgetGraphNode[],

  edges: [
    // Category hierarchy
    { source: 'cat:housing', target: 'cat:rent', relation: 'hasChild' },
    { source: 'cat:housing', target: 'cat:utilities', relation: 'hasChild' },
    { source: 'cat:food', target: 'cat:groceries', relation: 'hasChild' },
    { source: 'cat:food', target: 'cat:dining', relation: 'hasChild' },
    { source: 'cat:transport', target: 'cat:fuel', relation: 'hasChild' },
    { source: 'cat:transport', target: 'cat:transit', relation: 'hasChild' },

    // Budgets to categories
    { source: 'budget:rent', target: 'cat:rent', relation: 'appliesTo' },
    { source: 'budget:utilities', target: 'cat:utilities', relation: 'appliesTo' },
    { source: 'budget:groceries', target: 'cat:groceries', relation: 'appliesTo' },
    { source: 'budget:dining', target: 'cat:dining', relation: 'appliesTo' },
    { source: 'budget:fuel', target: 'cat:fuel', relation: 'appliesTo' },
    { source: 'budget:transit', target: 'cat:transit', relation: 'appliesTo' },

    // Goals to accounts
    { source: 'goal:emergency', target: 'account:savings', relation: 'targets' },
    { source: 'goal:vacation', target: 'account:checking', relation: 'targets' },

    // Account funding edges
    { source: 'account:checking', target: 'tx:rent-jan', relation: 'funds' },
    { source: 'account:checking', target: 'tx:utilities-jan', relation: 'funds' },
    { source: 'account:checking', target: 'tx:groceries-1', relation: 'funds' },
    { source: 'account:checking', target: 'tx:groceries-2', relation: 'funds' },
    { source: 'account:credit', target: 'tx:dining-1', relation: 'funds' },
    { source: 'account:checking', target: 'tx:fuel-1', relation: 'funds' },
    { source: 'account:checking', target: 'tx:transit-1', relation: 'funds' },
    { source: 'account:checking', target: 'tx:groceries-3', relation: 'funds' },
    { source: 'account:credit', target: 'tx:dining-2', relation: 'funds' },
    { source: 'account:checking', target: 'tx:savings-transfer', relation: 'funds' },

    // Transaction categorization
    { source: 'tx:rent-jan', target: 'cat:rent', relation: 'categorizedAs' },
    { source: 'tx:utilities-jan', target: 'cat:utilities', relation: 'categorizedAs' },
    { source: 'tx:groceries-1', target: 'cat:groceries', relation: 'categorizedAs' },
    { source: 'tx:groceries-2', target: 'cat:groceries', relation: 'categorizedAs' },
    { source: 'tx:groceries-3', target: 'cat:groceries', relation: 'categorizedAs' },
    { source: 'tx:dining-1', target: 'cat:dining', relation: 'categorizedAs' },
    { source: 'tx:dining-2', target: 'cat:dining', relation: 'categorizedAs' },
    { source: 'tx:fuel-1', target: 'cat:fuel', relation: 'categorizedAs' },
    { source: 'tx:transit-1', target: 'cat:transit', relation: 'categorizedAs' },

    // Transaction payees
    { source: 'tx:rent-jan', target: 'payee:landlord', relation: 'to' },
    { source: 'tx:utilities-jan', target: 'payee:utility', relation: 'to' },
    { source: 'tx:groceries-1', target: 'payee:grocery', relation: 'to' },
    { source: 'tx:groceries-2', target: 'payee:grocery', relation: 'to' },
    { source: 'tx:groceries-3', target: 'payee:grocery', relation: 'to' },
    { source: 'tx:dining-1', target: 'payee:restaurant', relation: 'to' },
    { source: 'tx:dining-2', target: 'payee:restaurant', relation: 'to' },
    { source: 'tx:fuel-1', target: 'payee:fuel', relation: 'to' },
    { source: 'tx:transit-1', target: 'payee:transit', relation: 'to' },
  ] satisfies BudgetGraphEdge[],
}
