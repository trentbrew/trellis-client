---
description: Identify edge cases
---
9:03 AMBefore implementing any solution, pause and systematically consider edge cases:

Empty/null inputs – What happens with no data, null values, empty strings, empty arrays?
Boundary values – Zero, negative numbers, MAX_INT, off-by-one errors, first/last elements
Type surprises – Unexpected types, NaN, undefined vs null, implicit coercions
Scale extremes – Single element, massive inputs, deeply nested structures
Concurrency & timing – Race conditions, duplicate calls, stale state, out-of-order execution
Malformed input – Extra whitespace, mixed encodings, missing fields, partial data
State transitions – What if it's called twice? What if a prior step failed silently?

For each edge case you identify: decide whether to handle it, reject it, or document it—never ignore it. Write at least one test for every edge case you handle.
