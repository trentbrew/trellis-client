/** Code-point aware text helpers — matches RealtimeText indices. */

export function codePointLen(str: string): number {
  return [...str].length
}

export function textDiff(
  oldStr: string,
  newStr: string,
): { index: number; removed: number; inserted: string } {
  const old = [...oldStr]
  const neu = [...newStr]
  let start = 0
  const min = Math.min(old.length, neu.length)
  while (start < min && old[start] === neu[start]) start++
  let endOld = old.length
  let endNew = neu.length
  while (endOld > start && endNew > start && old[endOld - 1] === neu[endNew - 1]) {
    endOld--
    endNew--
  }
  return {
    index: start,
    removed: endOld - start,
    inserted: neu.slice(start, endNew).join(''),
  }
}
