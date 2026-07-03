import { TrellisDb } from 'trellis/browser'
import { installKernelBridgeHttpProxy } from './http-proxy'

/** TrellisDb shim over embedded kernel — HTTP + SSE (ADR-002 kernel-bridge). */
export function createKernelBridgeClient(): TrellisDb {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:1414'
  const db = new TrellisDb({ url: origin })
  installKernelBridgeHttpProxy(db as unknown as Parameters<typeof installKernelBridgeHttpProxy>[0])
  return db
}
