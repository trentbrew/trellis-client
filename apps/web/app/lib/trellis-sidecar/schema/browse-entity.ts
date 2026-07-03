import { defineType } from 'trellis/browser'
import { z } from 'zod'

/** Aggregate browse row served by kernel-bridge (ADR-002 TRL-17). */
export const KernelBrowseType = defineType(
  'KernelBrowse',
  {
    title: z.string(),
    entityType: z.string(),
    payloadJson: z.string(),
  },
  {
    title: 'title',
    extends: 'core:Record',
    label: 'Kernel Browse Entity',
  },
)

export type SidecarKernelBrowseRow = {
  id: string
  type: 'KernelBrowse'
  title: string
  entityType: string
  payloadJson: string
}
