import { TrellisDb } from 'trellis/browser'
import { installHttpProxy } from './http-proxy'

export type TrellisSidecarClientOptions = {
  /** WS + HTTP origin (direct WS, proxied HTTP). */
  url: string
  apiKey?: string
}

export function createTrellisSidecarClient(opts: TrellisSidecarClientOptions): TrellisDb {
  const db = new TrellisDb({
    url: opts.url.replace(/\/$/, ''),
    apiKey: opts.apiKey?.trim() || undefined,
  })
  installHttpProxy(db as unknown as Parameters<typeof installHttpProxy>[0])
  return db
}
