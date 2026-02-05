/**
 * Browser Console Script to Clear and Re-seed Stations
 *
 * Instructions:
 * 1. Open http://localhost:5151/welcome in your browser
 * 2. Open DevTools (F12) and go to Console
 * 3. Paste this script and press Enter
 */

;(async () => {
  console.log('🗑️  Clearing existing stations...')

  // Get InstantDB instance from Nuxt
  const { $instant } = window.__NUXT__

  if (!$instant) {
    console.error('❌ InstantDB not found. Make sure you are on a Nuxt page.')
    return
  }

  const instant = $instant

  // Get all existing stations
  const result = await instant.queryOnce({
    stations: {},
  })
  const stations = result.data?.stations || []

  console.log(`Found ${stations.length} existing stations`)

  // Delete all existing stations
  for (const station of stations) {
    await instant.transact([instant.tx.stations[station.id].delete()])
  }

  console.log('✅ Cleared all stations')

  // Get current user
  const authResult = await instant.queryOnce({
    $users: {},
  })
  const users = authResult.data?.$users || []

  if (users.length === 0) {
    console.error('❌ No users found. Please log in first.')
    return
  }

  const userId = users[0].id

  // Import seedStations function (it should be available globally or we can call it directly)
  // For now, let's create stations manually with the new streamUrl field
  const demoStations = [
    {
      id: crypto.randomUUID(),
      ownerId: userId,
      tenantId: 'speakmpls',
      name: 'Speak Minneapolis',
      slug: 'mpls',
      location: { city: 'Minneapolis', state: 'MN', region: 'Midwest' },
      features: { vod: true, liveStreaming: true, scheduling: true },
      cablecastBaseUrl: 'https://trms.speakmpls.com',
      cablecastApiPath: '/CablecastAPI',
      streamUrl: 'https://webstream.docket.tv/3',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      ownerId: userId,
      tenantId: 'reflect-bayarea',
      name: 'Reflect Bay Area',
      slug: 'bayarea',
      location: { city: 'San Francisco', state: 'CA', region: 'Bay Area' },
      features: { vod: true, liveStreaming: true, scheduling: true },
      cablecastBaseUrl: 'https://reflect-bayarea.cablecast.tv',
      cablecastApiPath: '/CablecastAPI',
      streamUrl: 'https://reflect-bayarea.cablecast.tv/cablecastapi/live?channel_id=2&use_cdn=true',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      ownerId: userId,
      tenantId: 'stl-tv-mo',
      name: 'STL TV Missouri',
      slug: 'stl',
      location: { city: 'St. Louis', state: 'MO', region: 'Midwest' },
      features: { vod: true, liveStreaming: true, scheduling: true },
      cablecastBaseUrl: 'https://stl-tv-mo.cablecast.tv',
      cablecastApiPath: '/CablecastAPI',
      streamUrl: 'https://stl-tv-mo.cablecast.tv/cablecastapi/live?channel_id=1&use_cdn=true',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  console.log('🌱 Seeding demo stations with streamUrl...')

  for (const station of demoStations) {
    await instant.transact([instant.tx.stations[station.id].update(station)])
  }

  console.log(`✅ Seeded ${demoStations.length} stations`)
  console.log('🎉 Done! Refresh the page to see the new stations with streamUrl.')
})()
