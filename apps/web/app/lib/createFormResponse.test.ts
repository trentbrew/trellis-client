import { describe, it, expect, vi } from 'vitest'
import {
  createFormResponse,
  FormResponseValidationError,
  resolveFormLayout,
} from '~/lib/createFormResponse'
import type { OntologySchemaDefinition } from '~/lib/ontology-registry/schemas-to-server-types'

const feedbackSchema: OntologySchemaDefinition = {
  '@id': 'trellis:schema/feedback',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  label: 'Feedback',
  formPresentation: 'stacked',
  fields: [
    { name: 'title', valueType: 'title', required: true },
    { name: 'rating', valueType: 'select', required: true, selectOptions: [{ name: 'Good' }, { name: 'Bad' }] },
    { name: 'comments', valueType: 'rich_text' },
  ],
}

describe('resolveFormLayout', () => {
  it('maps entity-dialog to stacked', () => {
    expect(resolveFormLayout('entity-dialog')).toBe('stacked')
  })

  it('passes survey through unchanged', () => {
    expect(resolveFormLayout('survey')).toBe('survey')
  })
})

describe('createFormResponse', () => {
  it('creates entity with submittedVia stamp', async () => {
    const createItem = vi.fn(async (entity) => {
      expect(entity.submittedVia).toBe('form')
      expect(entity.title).toBe('Great product')
      expect(entity.type).toBe('feedback')
      return 'entity:feedback-1'
    })

    const id = await createFormResponse(
      'feedback',
      feedbackSchema,
      { title: 'Great product', rating: 'Good', comments: 'Nice work' },
      createItem,
    )

    expect(id).toBe('entity:feedback-1')
    expect(createItem).toHaveBeenCalledOnce()
  })

  it('throws on validation failure', async () => {
    const createItem = vi.fn()

    await expect(
      createFormResponse('feedback', feedbackSchema, { title: '', rating: 'Good' }, createItem),
    ).rejects.toBeInstanceOf(FormResponseValidationError)

    expect(createItem).not.toHaveBeenCalled()
  })

  it('uses Untitled when title is blank after trim', async () => {
    const createItem = vi.fn(async (entity) => {
      expect(entity.title).toBe('Untitled')
      return 'entity:feedback-2'
    })

    await createFormResponse('feedback', feedbackSchema, { title: '  ', rating: 'Bad' }, createItem)
  })
})
