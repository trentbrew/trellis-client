/**
 * Update existing stations with logoUrl field
 * Run with: tsx scripts/update-station-logos.ts
 */

const init = (_args: any): any => {
  throw new Error('InstantDB has been removed from this prototype. This script is deprecated.')
}

const APP_ID = process.env.INSTANT_APP_ID || 'def5bfe2-f194-49d0-81f9-53f794eaba67'
const ADMIN_TOKEN = process.env.INSTANT_SECRET || 'e481d91f-e1fd-4836-a688-c1a9fa9012dc'

const db: any = init({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN,
})

const logoUrls: Record<string, string> = {
  speakmpls: 'https://docket.pockethost.io/api/files/h5nhi1lcdhctt12/2lg504diumw1lra/image_294_tm82eww9ee.png?token=',
  'reflect-bayarea':
    'https://docket.pockethost.io/api/files/h5nhi1lcdhctt12/2lg504diumw1lra/image_293_Dgi2j1Wnnc.png?token=',
  'stl-tv-mo':
    'https://docket.pockethost.io/api/files/h5nhi1lcdhctt12/2lg504diumw1lra/group_1170_hnOKp8iNMT.png?token=',
}

async function updateStationLogos() {
  console.log('[UpdateStationLogos] Fetching stations...')

  const result = await db.query({ stations: {} })

  const stations = (result as any)?.stations || []
  console.log(`[UpdateStationLogos] Found ${stations.length} stations`)

  for (const station of stations) {
    const logoUrl = logoUrls[station.tenantId]

    if (logoUrl) {
      console.log(`[UpdateStationLogos] Updating ${station.name} with logo URL`)
      await db.transact([
        db.tx.stations[station.id].update({
          logoUrl,
        }),
      ])
    } else {
      console.log(`[UpdateStationLogos] No logo URL found for ${station.name} (${station.tenantId})`)
    }
  }

  console.log('[UpdateStationLogos] Done!')
  process.exit(0)
}

updateStationLogos().catch((error) => {
  console.error('[UpdateStationLogos] Error:', error)
  process.exit(1)
})

export {}
