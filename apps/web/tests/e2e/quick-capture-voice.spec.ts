import { expect, test } from '@playwright/test'

test.describe('Quick capture voice memo', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      class MockMediaRecorder {
        state = 'inactive'
        mimeType = 'audio/webm'
        ondataavailable: ((e: { data: Blob }) => void) | null = null
        onstop: (() => void) | null = null

        constructor(_stream: MediaStream, _opts?: MediaRecorderOptions) {}

        start() {
          this.state = 'recording'
          setTimeout(() => {
            this.ondataavailable?.({ data: new Blob(['fake-audio'], { type: 'audio/webm' }) })
          }, 50)
        }

        stop() {
          this.state = 'inactive'
          setTimeout(() => this.onstop?.(), 10)
        }
      }

      Object.defineProperty(window, 'MediaRecorder', {
        writable: true,
        value: MockMediaRecorder,
      })
      ;(MockMediaRecorder as unknown as { isTypeSupported: (t: string) => boolean }).isTypeSupported = () => true

      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop: () => {} }],
          }),
        },
      })
    })

    await page.route('**/api/transcribe-audio', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transcript: 'Hello from mocked transcription.', model: 'gemini-2.0-flash' }),
      })
    })

    await page.route('**/api/storage/local-upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: '/api/storage/local-file?path=entities%2Fvoice-memo%2Ftest.webm',
          path: 'entities/voice-memo/test.webm',
          filename: 'voice-memo.webm',
          contentType: 'audio/webm',
          size: 128,
        }),
      })
    })
  })

  test('voice tab shows recording UI and transcribed review state', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Meta+Shift+N')

    const panel = page.locator('[data-quick-capture-panel]')
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByRole('tab', { name: 'Voice' }).click()
    await expect(panel.getByText('Tap to record a voice memo')).toBeVisible()

    await panel.getByRole('button', { name: 'Start recording' }).click()
    await expect(panel.getByText('Press Enter or Space to stop')).toBeVisible({ timeout: 5_000 })

    await panel.getByRole('button', { name: 'Stop recording' }).click()
    await expect(panel.getByText('Transcribing…')).toBeVisible({ timeout: 5_000 })
    await expect(panel.getByText('Transcribing…')).toBeHidden({ timeout: 15_000 })

    const textarea = panel.locator('textarea')
    await expect(textarea).toHaveValue('Hello from mocked transcription.')
    await expect(panel.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  test('text and voice mode toggle', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Meta+Shift+N')

    const panel = page.locator('[data-quick-capture-panel]')
    await expect(panel).toBeVisible({ timeout: 10_000 })

    await panel.getByRole('tab', { name: 'Voice' }).click()
    await expect(panel.getByText('Tap to record a voice memo')).toBeVisible()

    await panel.getByRole('tab', { name: 'Text' }).click()
    await expect(panel.locator('.ProseMirror')).toBeVisible({ timeout: 5_000 })
  })
})
