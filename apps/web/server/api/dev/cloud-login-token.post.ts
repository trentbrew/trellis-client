import { z } from 'zod'
import { parseApiBody } from '../../utils/api-validation'

const CloudDevLoginBodySchema = z.object({
  email: z.string().trim().toLowerCase().email('email must be valid'),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const dataMode = (config.public.dataMode || process.env.TRELLIS_DATA_MODE || 'local') as 'local' | 'cloud'
  const enabled = config.public.enableCloudDevLogin === true && process.env.NODE_ENV !== 'production'

  if (!enabled) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  if (dataMode !== 'cloud') {
    throw createError({ statusCode: 400, message: 'Cloud dev login requires TRELLIS_DATA_MODE=cloud' })
  }

  const { email } = await parseApiBody(event, CloudDevLoginBodySchema)
  const db = useInstantAdmin()
  const token = await db.auth.createToken({ email })

  return { token }
})
