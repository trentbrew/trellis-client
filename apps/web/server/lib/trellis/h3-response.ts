import type { H3Event } from 'h3'
import { setResponseHeader, setResponseStatus } from 'h3'

/** Bridge Web Response objects from sidecar proxies into Nitro handlers. */
export async function sendWebResponse(event: H3Event, res: Response): Promise<unknown> {
  setResponseStatus(event, res.status)
  const contentType = res.headers.get('Content-Type')
  if (contentType) setResponseHeader(event, 'Content-Type', contentType)

  const text = await res.text()
  if (!text) return null

  if (contentType?.includes('application/json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return text
}
