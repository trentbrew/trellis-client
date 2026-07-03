import { defineType } from 'trellis/browser'
import { z } from 'zod'

/** Graph-resident shell route (`app_route` in embedded kernel). */
export const AppRouteType = defineType(
  'AppRoute',
  {
    title: z.string(),
    configJson: z.string(),
  },
  {
    title: 'title',
    extends: 'core:Record',
    label: 'App Route',
  },
)

/** Graph-resident ontology schema (`trellis_schema` in embedded kernel). */
export const AppSchemaType = defineType(
  'AppSchema',
  {
    title: z.string(),
    schemaId: z.string(),
    configJson: z.string(),
  },
  {
    title: 'title',
    extends: 'core:Record',
    label: 'App Schema',
  },
)

/** Graph-resident kernel projection (`app_projection` in embedded kernel). */
export const AppProjectionType = defineType(
  'AppProjection',
  {
    title: z.string(),
    projectionId: z.string(),
    configJson: z.string(),
  },
  {
    title: 'title',
    extends: 'core:Record',
    label: 'App Projection',
  },
)

/** Collection view registry node (`app_projection_view` in embedded kernel). */
export const AppProjectionViewType = defineType(
  'AppProjectionView',
  {
    title: z.string(),
    projectionType: z.string(),
    configJson: z.string(),
  },
  {
    title: 'title',
    extends: 'core:Record',
    label: 'App Projection View',
  },
)

export type SidecarAppRoute = {
  id: string
  type: 'AppRoute'
  title: string
  configJson: string
}

export type SidecarAppSchema = {
  id: string
  type: 'AppSchema'
  title: string
  schemaId: string
  configJson: string
}

export type SidecarAppProjection = {
  id: string
  type: 'AppProjection'
  title: string
  projectionId: string
  configJson: string
}

export type SidecarAppProjectionView = {
  id: string
  type: 'AppProjectionView'
  title: string
  projectionType: string
  configJson: string
}
