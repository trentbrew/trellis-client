/** Slide region key encoding — entity ids contain colons; use pipe delimiter */
export const SLIDE_REGION_KEY_SEP = '|'

export function makeSlideRegionKey(entityId: string, regionId: string): string {
  return `${entityId}${SLIDE_REGION_KEY_SEP}${regionId}`
}

export function parseSlideRegionKey(key: string): { entityId: string; regionId: string } | null {
  const sep = key.indexOf(SLIDE_REGION_KEY_SEP)
  if (sep < 0) return null
  return {
    entityId: key.slice(0, sep),
    regionId: key.slice(sep + SLIDE_REGION_KEY_SEP.length),
  }
}
