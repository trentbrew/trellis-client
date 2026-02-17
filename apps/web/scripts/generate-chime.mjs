/**
 * Generates a subtle notification chime as a WAV file.
 * Run: node scripts/generate-chime.mjs
 * Output: public/sounds/notify.mp3 (actually WAV, but browsers handle it)
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputDir = join(__dirname, '..', 'public', 'sounds')
const outputPath = join(outputDir, 'notify.mp3')

const SAMPLE_RATE = 44100
const DURATION = 0.4 // seconds
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION)

// Generate a gentle two-tone chime (C6 + E6, quick fade)
const samples = new Float32Array(NUM_SAMPLES)
const freq1 = 1047 // C6
const freq2 = 1319 // E6

for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / SAMPLE_RATE
  // Envelope: quick attack, smooth exponential decay
  const envelope = Math.exp(-t * 8) * Math.min(t * 200, 1)
  // Two sine tones blended
  const tone1 = Math.sin(2 * Math.PI * freq1 * t) * 0.5
  const tone2 = Math.sin(2 * Math.PI * freq2 * t) * 0.3
  samples[i] = (tone1 + tone2) * envelope * 0.6
}

// Encode as 16-bit PCM WAV
const numChannels = 1
const bitsPerSample = 16
const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
const blockAlign = numChannels * (bitsPerSample / 8)
const dataSize = NUM_SAMPLES * numChannels * (bitsPerSample / 8)
const headerSize = 44

const buffer = Buffer.alloc(headerSize + dataSize)

// RIFF header
buffer.write('RIFF', 0)
buffer.writeUInt32LE(36 + dataSize, 4)
buffer.write('WAVE', 8)

// fmt chunk
buffer.write('fmt ', 12)
buffer.writeUInt32LE(16, 16) // chunk size
buffer.writeUInt16LE(1, 20) // PCM format
buffer.writeUInt16LE(numChannels, 22)
buffer.writeUInt32LE(SAMPLE_RATE, 24)
buffer.writeUInt32LE(byteRate, 28)
buffer.writeUInt16LE(blockAlign, 32)
buffer.writeUInt16LE(bitsPerSample, 34)

// data chunk
buffer.write('data', 36)
buffer.writeUInt32LE(dataSize, 40)

for (let i = 0; i < NUM_SAMPLES; i++) {
  const s = Math.max(-1, Math.min(1, samples[i]))
  const val = Math.floor(s * 32767)
  buffer.writeInt16LE(val, 44 + i * 2)
}

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, buffer)
console.log(`Chime written to ${outputPath} (${buffer.length} bytes, ${DURATION}s)`)
