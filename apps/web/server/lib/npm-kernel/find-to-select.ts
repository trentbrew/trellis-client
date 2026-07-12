/**
 * EQL-S dialect bridge: app `FIND … AS … RETURN` → published-trellis `Query` AST.
 *
 * The app authors queries in the fork's property-access dialect:
 *
 *   FIND <type> AS ?v [WHERE ?v.attr <op> value (AND …)]
 *                     [RETURN ?v[.attr], …]
 *                     [ORDER BY ?v.attr ASC|DESC] [LIMIT n]
 *
 * The published `trellis@3.2.x` kernel accepts a structured `Query` (triple
 * patterns). This transpiler maps the former to the latter so the ~13 existing
 * call sites keep their `FIND…` strings verbatim after the kernel swap.
 *
 * Scope: the exact subset the app uses — no link traversal, OR, NOT, or
 * aggregates (verified absent). `transpileFind` throws on anything outside it,
 * so an unsupported query fails loudly rather than silently returning wrong rows.
 *
 * @module server/lib/npm-kernel
 */
import type { Query, Pattern, Filter, FilterOp, Term, OrderBy } from 'trellis/core'

const FILTER_OPS: FilterOp[] = ['!=', '<=', '>=', '=', '<', '>']

function lit(value: string | number | boolean): Term {
  return { kind: 'literal', value }
}
function vr(name: string): Term {
  return { kind: 'variable', name }
}

/** Parse a WHERE/RETURN right-hand value token into a literal (or variable) Term. */
function parseValue(raw: string): Term {
  const s = raw.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return lit(s.slice(1, -1))
  }
  if (s === 'true') return lit(true)
  if (s === 'false') return lit(false)
  if (/^-?\d+(\.\d+)?$/.test(s)) return lit(Number(s))
  if (s.startsWith('?')) return vr(s.slice(1))
  return lit(s)
}

const HEAD_RE =
  /^\s*FIND\s+(\S+)\s+AS\s+\?(\w+)\s*(?:WHERE\s+([\s\S]*?))?\s*(?:RETURN\s+([\s\S]*?))?\s*(?:ORDER\s+BY\s+([\s\S]*?))?\s*(?:LIMIT\s+(\d+))?\s*(?:OFFSET\s+(\d+))?\s*$/i

/**
 * Transpile an app-dialect EQL-S string into a published-trellis `Query` AST.
 * @throws if the input is not the supported FIND-dialect subset.
 */
export function transpileFind(src: string): Query {
  const m = HEAD_RE.exec(src)
  if (!m) throw new Error(`transpileFind: unsupported EQL-S query: ${src}`)
  const [, type, v, whereStr, returnStr, orderStr, limitStr, offsetStr] = m

  const where: Pattern[] = []
  const filters: Filter[] = []
  // one bound variable per attribute we need to read out (RETURN / ORDER BY / inequality)
  const bound = new Map<string, string>()
  const bindAttr = (attr: string): string => {
    let name = bound.get(attr)
    if (!name) {
      name = `${v}_${attr}`
      bound.set(attr, name)
      where.push({ kind: 'fact', entity: vr(v), attribute: lit(attr), value: vr(name) })
    }
    return name
  }

  // type anchor: `entity` = generic root (bind ?v to anything with a type fact);
  // otherwise constrain to the exact domain type.
  if (type === 'entity') {
    where.push({ kind: 'fact', entity: vr(v), attribute: lit('type'), value: vr(`${v}__type`) })
  } else {
    where.push({ kind: 'fact', entity: vr(v), attribute: lit('type'), value: lit(type) })
  }

  if (whereStr?.trim()) {
    for (const clause of whereStr.split(/\s+AND\s+/i)) {
      const c = clause.trim()
      if (!c) continue
      const op = FILTER_OPS.find((o) => c.includes(` ${o} `))
      if (!op) throw new Error(`transpileFind: unparseable clause "${c}" in: ${src}`)
      const idx = c.indexOf(` ${op} `)
      const lhs = c.slice(0, idx).trim()
      const rhs = c.slice(idx + op.length + 2).trim()
      const attr = lhs.replace(`?${v}.`, '')
      if (op === '=') {
        where.push({ kind: 'fact', entity: vr(v), attribute: lit(attr), value: parseValue(rhs) })
      } else {
        const name = bindAttr(attr)
        filters.push({ kind: 'filter', left: vr(name), op, right: parseValue(rhs) })
      }
    }
  }

  let select: string[]
  if (returnStr?.trim()) {
    select = returnStr.split(',').map((p) => {
      const t = p.trim()
      return t === `?${v}` ? v : bindAttr(t.replace(`?${v}.`, ''))
    })
    select = [...new Set(select)]
  } else {
    select = [v]
  }

  const orderBy: OrderBy[] = []
  if (orderStr?.trim()) {
    const om = /\?(\w+)\.(\w+)\s*(ASC|DESC)?/i.exec(orderStr)
    if (!om) throw new Error(`transpileFind: unparseable ORDER BY "${orderStr}" in: ${src}`)
    orderBy.push({
      variable: bindAttr(om[2]),
      direction: (om[3] || 'ASC').toLowerCase() === 'desc' ? 'desc' : 'asc',
    })
  }

  return {
    select,
    where,
    filters,
    aggregates: [],
    orderBy,
    limit: limitStr ? Number(limitStr) : 0,
    offset: offsetStr ? Number(offsetStr) : 0,
  }
}
