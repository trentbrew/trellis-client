<script setup lang="ts">
  import { budgetGraphDemo } from '~/data/budgetGraphDemo'

  const { evaluateSingleFormula } = useCollectionFormulas('test')

  const sampleBudgetData = ref({
    categories: [
      { name: 'Housing', budgeted: 2000, spent: 1850 },
      { name: 'Food', budgeted: 600, spent: 580 },
      { name: 'Transportation', budgeted: 400, spent: 420 },
      { name: 'Entertainment', budgeted: 200, spent: 150 },
      { name: 'Utilities', budgeted: 300, spent: 280 },
      { name: 'Savings', budgeted: 500, spent: 500 },
      { name: 'Healthcare', budgeted: 250, spent: 180 },
      { name: 'Misc', budgeted: 150, spent: 120 },
    ],
  })

  const formulaExamples = ref([
    {
      name: 'Total Budgeted',
      formula: 'categories.reduce((sum, c) => sum + c.budgeted, 0)',
      description: 'Sum all budgeted amounts',
    },
    {
      name: 'Total Budgeted (Helper)',
      formula: '$sum(...categories.map(c => c.budgeted))',
      description: 'Same as above using $sum helper',
    },
    {
      name: 'Total Spent',
      formula: '$sum(...categories.map(c => c.spent))',
      description: 'Sum all spent amounts',
    },
    {
      name: 'Total Remaining',
      formula: '$sum(...categories.map(c => c.budgeted - c.spent))',
      description: 'Calculate remaining budget',
    },
    {
      name: 'Total Budgeted (Formatted)',
      formula: '$currency(categories.reduce((sum, c) => sum + c.budgeted, 0))',
      description: 'Format total as currency',
    },
    {
      name: 'Budget Utilization',
      formula: '$percent($sum(...categories.map(c => c.spent)) / $sum(...categories.map(c => c.budgeted)))',
      description: 'Percentage of budget used',
    },
    {
      name: 'Average Category Budget',
      formula: '$avg(...categories.map(c => c.budgeted))',
      description: 'Average budgeted amount per category',
    },
    {
      name: 'Categories Over Budget',
      formula: '$count(categories.filter(c => c.spent > c.budgeted))',
      description: 'Count categories that went over budget',
    },
    {
      name: 'Highest Budget Category',
      formula: 'categories.reduce((max, c) => c.budgeted > max.budgeted ? c : max).name',
      description: 'Find category with highest budget',
    },
    {
      name: 'Budget Status',
      formula:
        '$if($sum(...categories.map(c => c.spent)) > $sum(...categories.map(c => c.budgeted)), "Over Budget", "Under Budget")',
      description: 'Overall budget status',
    },
  ])

  const results = computed(() => {
    return formulaExamples.value.map((example) => {
      try {
        const result = evaluateSingleFormula(example.formula, sampleBudgetData.value)
        return {
          ...example,
          result,
          error: null,
        }
      } catch (error) {
        return {
          ...example,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  })

  const customFormula = ref('categories.map(c => c.name).join(", ")')
  const customResult = computed(() => {
    try {
      return evaluateSingleFormula(customFormula.value, sampleBudgetData.value)
    } catch (error) {
      return error instanceof Error ? `Error: ${error.message}` : 'Error'
    }
  })

  // Graph-based budgeting demo data (multi-collection)
  const getNode = (id: string) => budgetGraphDemo.nodes.find((n) => n['@id'] === id)

  const graphContext = ref({
    nodes: budgetGraphDemo.nodes,
    edges: budgetGraphDemo.edges,
    accountChecking: getNode('account:checking'),
    accountSavings: getNode('account:savings'),
    accountCredit: getNode('account:credit'),
    catFood: getNode('cat:food'),
    catGroceries: getNode('cat:groceries'),
    catDining: getNode('cat:dining'),
    catTransport: getNode('cat:transport'),
    catFuel: getNode('cat:fuel'),
    catTransit: getNode('cat:transit'),
    budgetGroceries: getNode('budget:groceries'),
    budgetDining: getNode('budget:dining'),
    budgetFuel: getNode('budget:fuel'),
    budgetTransit: getNode('budget:transit'),
    goalEmergency: getNode('goal:emergency'),
    goalVacation: getNode('goal:vacation'),
    txRent: getNode('tx:rent-jan'),
  })

  const graphFormulaExamples = ref([
    {
      name: 'Groceries Spend',
      description: 'Sum spend for groceries category',
      formula: '$sum(...$related(catGroceries, "categorizedAs", "incoming").map(t => t.amount))',
    },
    {
      name: 'Food Rollup Spend',
      description: 'Sum spend across Food and its subcategories',
      formula:
        '$sum(...$descendants(catFood).map(c => $sum(...$related(c, "categorizedAs", "incoming").map(t => t.amount))))',
    },
    {
      name: 'Groceries Budget Utilization',
      description: 'Groceries spend vs budget',
      formula:
        '$percent($sum(...$related(catGroceries, "categorizedAs", "incoming").map(t => t.amount)) / budgetGroceries.amount)',
    },
    {
      name: 'Checking Outflow',
      description: 'Total outflow from Checking account',
      formula: '$sum(...$related(accountChecking, "funds", "outgoing").map(t => t.amount))',
    },
    {
      name: 'Emergency Fund Progress',
      description: 'Savings balance vs goal target',
      formula: '$percent(accountSavings.balance / goalEmergency.amount)',
    },
    {
      name: 'Transport Spend',
      description: 'Fuel + Transit rollup',
      formula:
        '$sum(...$descendants(catTransport).map(c => $sum(...$related(c, "categorizedAs", "incoming").map(t => t.amount))))',
    },
    {
      name: 'Is Rent Funded By Checking?',
      description: 'Check path between rent transaction and checking account',
      formula: '$related(txRent, "funds", "incoming").some(acc => acc["@id"] === "account:checking")',
    },
  ])

  const graphResults = computed(() => {
    return graphFormulaExamples.value.map((example) => {
      try {
        const result = evaluateSingleFormula(
          example.formula,
          graphContext.value,
          budgetGraphDemo.nodes,
          budgetGraphDemo.edges,
        )
        return {
          ...example,
          result,
          error: null,
        }
      } catch (error) {
        return {
          ...example,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  })

  const graphAccounts = computed(() => budgetGraphDemo.nodes.filter((n) => n.type === 'Account'))
  const graphBudgets = computed(() => budgetGraphDemo.nodes.filter((n) => n.type === 'Budget'))
  const graphTransactions = computed(() => budgetGraphDemo.nodes.filter((n) => n.type === 'Transaction'))
</script>

<template>
  <div class="space-y-8 p-8">
    <div>
      <h1 class="text-3xl font-bold">Formula Evaluation Playground</h1>
      <p class="text-muted-foreground mt-2">
        Test formula expressions with sample budget data. All formulas run client-side with Vue reactivity.
      </p>
    </div>

    <!-- Graph-Based Budget Demo -->
    <div class="space-y-6 rounded-lg border p-6">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-2xl font-semibold">Graph Demo: Multi-Collection Budget</h2>
            <p class="text-muted-foreground text-sm">
              Demonstrates accounts, categories, budgets, goals, and transactions with graph formulas.
            </p>
          </div>
          <div class="text-xs font-medium text-muted-foreground">
            {{ budgetGraphDemo.nodes.length }} nodes · {{ budgetGraphDemo.edges.length }} edges
          </div>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="space-y-4">
          <div class="rounded-lg border">
            <div class="border-b bg-muted/50 px-4 py-2 text-xs font-semibold">Accounts</div>
            <div class="divide-y">
              <div v-for="acct in graphAccounts" :key="acct['@id']" class="flex items-center justify-between px-4 py-2">
                <div class="text-sm font-medium">{{ acct.name }}</div>
                <div class="text-sm tabular-nums">
                  {{ acct.balance?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }}
                </div>
              </div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border">
              <div class="border-b bg-muted/50 px-4 py-2 text-xs font-semibold">Budgets</div>
              <div class="divide-y">
                <div v-for="budget in graphBudgets" :key="budget['@id']" class="px-4 py-2 text-sm">
                  <div class="font-medium">{{ budget.name }}</div>
                  <div class="text-muted-foreground">
                    {{ budget.amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }}
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-lg border">
              <div class="border-b bg-muted/50 px-4 py-2 text-xs font-semibold">Recent Transactions</div>
              <div class="divide-y">
                <div v-for="tx in graphTransactions.slice(0, 6)" :key="tx['@id']" class="px-4 py-2 text-sm">
                  <div class="font-medium">{{ tx.name }}</div>
                  <div class="text-muted-foreground">
                    {{ tx.amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div v-for="(item, idx) in graphResults" :key="idx" class="rounded-lg border p-4">
            <div class="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 class="font-medium">{{ item.name }}</h3>
                <p class="text-muted-foreground text-xs">{{ item.description }}</p>
              </div>
              <div v-if="item.error" class="rounded bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                Error
              </div>
              <div v-else class="rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">Success</div>
            </div>

            <div class="mb-2 rounded bg-muted/50 p-2">
              <code class="text-xs">{{ item.formula }}</code>
            </div>

            <div v-if="item.error" class="text-destructive text-sm">{{ item.error }}</div>
            <div v-else class="text-primary text-lg font-semibold">{{ item.result }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-8 lg:grid-cols-2">
      <!-- Sample Data -->
      <div class="space-y-4">
        <div>
          <h2 class="text-xl font-semibold">Sample Budget Data</h2>
          <p class="text-muted-foreground text-sm">Available in formulas as: categories, $records, etc.</p>
        </div>

        <div class="rounded-lg border">
          <div class="border-b bg-muted/50 px-4 py-2">
            <div class="grid grid-cols-3 gap-4 text-xs font-medium">
              <div>Category</div>
              <div class="text-right">Budgeted</div>
              <div class="text-right">Spent</div>
            </div>
          </div>
          <div class="divide-y">
            <div v-for="cat in sampleBudgetData.categories" :key="cat.name" class="grid grid-cols-3 gap-4 px-4 py-2">
              <div class="text-sm">{{ cat.name }}</div>
              <div class="text-right text-sm">${{ cat.budgeted.toLocaleString() }}</div>
              <div class="text-right text-sm">${{ cat.spent.toLocaleString() }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Formula Examples -->
      <div class="space-y-4">
        <div>
          <h2 class="text-xl font-semibold">Formula Examples</h2>
          <p class="text-muted-foreground text-sm">Pre-built formulas demonstrating various operations</p>
        </div>

        <div class="space-y-3">
          <div v-for="(item, idx) in results" :key="idx" class="rounded-lg border p-4">
            <div class="mb-2 flex items-start justify-between">
              <div>
                <h3 class="font-medium">{{ item.name }}</h3>
                <p class="text-muted-foreground text-xs">{{ item.description }}</p>
              </div>
              <div v-if="item.error" class="rounded bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                Error
              </div>
              <div v-else class="rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">Success</div>
            </div>

            <div class="mb-2 rounded bg-muted/50 p-2">
              <code class="text-xs">{{ item.formula }}</code>
            </div>

            <div v-if="item.error" class="text-destructive text-sm">{{ item.error }}</div>
            <div v-else class="text-primary text-lg font-semibold">{{ item.result }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Formula Tester -->
    <div class="space-y-4 rounded-lg border-2 border-dashed p-6">
      <div>
        <h2 class="text-xl font-semibold">Custom Formula Tester</h2>
        <p class="text-muted-foreground text-sm">Write your own formula and see results in real-time</p>
      </div>

      <div class="space-y-3">
        <div>
          <label class="mb-2 block text-sm font-medium">Formula Expression</label>
          <textarea
            v-model="customFormula"
            placeholder="e.g., categories.filter(c => c.spent > c.budgeted).length"
            rows="3"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium">Result</label>
          <div class="rounded-lg border bg-muted/30 p-4">
            <div class="text-primary text-xl font-semibold">{{ customResult }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Available Helpers Reference -->
    <div class="space-y-4 rounded-lg bg-muted/30 p-6">
      <div>
        <h2 class="text-xl font-semibold">Available Helper Functions</h2>
        <p class="text-muted-foreground text-sm">Use these functions in your formulas for common operations</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="space-y-2 rounded-lg border bg-background p-3">
          <h3 class="font-medium">Array Operations</h3>
          <div class="space-y-1 text-sm">
            <code class="text-muted-foreground block">$sum(...values)</code>
            <code class="text-muted-foreground block">$avg(...values)</code>
            <code class="text-muted-foreground block">$min(...values)</code>
            <code class="text-muted-foreground block">$max(...values)</code>
            <code class="text-muted-foreground block">$count(array)</code>
          </div>
        </div>

        <div class="space-y-2 rounded-lg border bg-background p-3">
          <h3 class="font-medium">Formatting</h3>
          <div class="space-y-1 text-sm">
            <code class="text-muted-foreground block">$currency(number)</code>
            <code class="text-muted-foreground block">$percent(decimal)</code>
            <code class="text-muted-foreground block">$date(value)</code>
            <code class="text-muted-foreground block">$round(number, decimals)</code>
          </div>
        </div>

        <div class="space-y-2 rounded-lg border bg-background p-3">
          <h3 class="font-medium">String Operations</h3>
          <div class="space-y-1 text-sm">
            <code class="text-muted-foreground block">$concat(...strings)</code>
            <code class="text-muted-foreground block">$upper(string)</code>
            <code class="text-muted-foreground block">$lower(string)</code>
            <code class="text-muted-foreground block">$trim(string)</code>
          </div>
        </div>

        <div class="space-y-2 rounded-lg border bg-background p-3">
          <h3 class="font-medium">Collection Queries</h3>
          <div class="space-y-1 text-sm">
            <code class="text-muted-foreground block">$filter(predicate)</code>
            <code class="text-muted-foreground block">$find(predicate)</code>
            <code class="text-muted-foreground block">$map(array, fn)</code>
            <code class="text-muted-foreground block">$reduce(array, fn, init)</code>
          </div>
        </div>

        <div class="space-y-2 rounded-lg border bg-background p-3">
          <h3 class="font-medium">Conditional</h3>
          <div class="space-y-1 text-sm">
            <code class="text-muted-foreground block">$if(cond, true, false)</code>
            <code class="text-muted-foreground block">$switch(value, cases, default)</code>
          </div>
        </div>

        <div class="space-y-2 rounded-lg border bg-background p-3">
          <h3 class="font-medium">Math</h3>
          <div class="space-y-1 text-sm">
            <code class="text-muted-foreground block">$floor(number)</code>
            <code class="text-muted-foreground block">$ceil(number)</code>
            <code class="text-muted-foreground block">$abs(number)</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
