import { createAvatar } from '@/features/avatar/avatars'
import { createInitialSequences } from '@/features/animation/sequences'
import { initialExpressions } from '@/features/avatar/presets'
import { createAvatarDefinition } from '@/features/avatar/avatarDefinition'
import {
  clearPersistedStudioDocument,
  createStudioDocumentStore,
  loadStudioDocument,
  parseStudioDocument,
  parseImportedStudioDocument,
  serializeStudioDocument,
  type StudioDocument,
} from '@/features/studio/studioDocument'

const documentFixture = (): StudioDocument => {
  const avatar = createAvatar('Strobi')
  return {
    version: 2,
    bundledAvatarVersion: 1,
    library: {
      activeAvatarId: avatar.id,
      avatars: [avatar],
    },
    expressions: initialExpressions,
    sequences: createInitialSequences(),
    playback: { stateId: 'idle', playing: true },
  }
}

describe('Studio document', () => {
  const storage = (value: string | null = null) => ({ getItem: () => value })

  it('loads the bundled Studio snapshot when no local project exists', () => {
    const document = loadStudioDocument(storage())

    expect(document.library.avatars).toHaveLength(11)
    expect(document.library.activeAvatarId).toBe(document.library.avatars[0].id)
    expect(document.library.avatars[0].name).toBe('Strobi')
    expect(document.expressions).toHaveLength(27)
    expect(document.sequences).toHaveLength(23)
    expect(document.expressions.every(expression => expression.semanticKey)).toBe(true)
    expect(document.sequences.every(sequence => sequence.semanticKey)).toBe(true)
    expect(document.playback).toEqual({ stateId: 'proud', playing: true })
  })

  it('clears only the persisted Studio project', () => {
    const removeItem = vi.fn()

    expect(clearPersistedStudioDocument({ removeItem })).toBe(true)
    expect(removeItem).toHaveBeenCalledExactlyOnceWith('bible-strong-avatar-studio-v2')
  })

  it('keeps a locally saved project authoritative over the bundled snapshot', () => {
    const localDocument = documentFixture()

    expect(loadStudioDocument(storage(JSON.stringify(localDocument)))).toEqual(localDocument)
  })

  it('restores bundled semantic keys in a legacy local project', () => {
    const fallback = loadStudioDocument(storage())
    const legacy = structuredClone(fallback)
    legacy.expressions.forEach(expression => delete expression.semanticKey)
    legacy.sequences.forEach(sequence => delete sequence.semanticKey)

    const document = parseStudioDocument(legacy, fallback)

    expect(document.expressions.map(expression => expression.semanticKey)).toEqual(
      fallback.expressions.map(expression => expression.semanticKey)
    )
    expect(document.sequences.map(sequence => sequence.semanticKey)).toEqual(
      fallback.sequences.map(sequence => sequence.semanticKey)
    )
    expect(
      createAvatarDefinition({
        avatar: document.library.avatars[0],
        behavior: { expressions: document.expressions, sequences: document.sequences },
      }).ok
    ).toBe(true)
  })

  it('restores bundled keys in legacy avatar-owned behavior without naming custom items', () => {
    const fallback = loadStudioDocument(storage())
    const legacy = structuredClone(fallback)
    const avatar = legacy.library.avatars[0]
    avatar.behavior = {
      expressions: legacy.expressions.map(expression => ({
        ...expression,
        semanticKey: undefined,
      })),
      sequences: legacy.sequences.map(sequence => ({ ...sequence, semanticKey: undefined })),
    }
    avatar.behavior.expressions.push({
      ...avatar.behavior.expressions[0],
      id: 'expression-custom',
      semanticKey: undefined,
    })

    const document = parseStudioDocument(legacy, fallback)
    const behavior = document.library.avatars[0].behavior!

    expect(behavior.expressions[0].semanticKey).toBe(fallback.expressions[0].semanticKey)
    expect(behavior.sequences[0].semanticKey).toBe(fallback.sequences[0].semanticKey)
    expect(behavior.expressions.at(-1)?.semanticKey).toBeUndefined()
  })

  it('persists one coherent document after a mutation', () => {
    const persisted: StudioDocument[] = []
    const store = createStudioDocumentStore(documentFixture(), value => persisted.push(value))

    store.update({ playback: { stateId: 'idle', playing: false } })

    expect(persisted).toHaveLength(1)
    expect(persisted[0].playback).toEqual({ stateId: 'idle', playing: false })
    expect(persisted[0].expressions).toHaveLength(initialExpressions.length)
  })

  it('repairs sequence references in the same transaction as expression deletion', () => {
    const store = createStudioDocumentStore(documentFixture(), () => undefined)
    const remainingExpressions = initialExpressions.slice(1)

    const next = store.update({ expressions: remainingExpressions })

    expect(
      next.sequences.every(sequence =>
        sequence.steps.every(step =>
          remainingExpressions.some(item => item.id === step.expressionId)
        )
      )
    ).toBe(true)
  })

  it('round-trips a complete project document as portable JSON', () => {
    const document = documentFixture()
    const expression = { ...initialExpressions[0], semanticKey: 'happy-smile', widthLeft: 42 }
    const sequence = {
      ...createInitialSequences()[0],
      semanticKey: 'happy',
      steps: createInitialSequences()[0].steps.map(step => ({
        ...step,
        expressionId: expression.id,
      })),
    }
    document.library.avatars[0].behavior = {
      expressions: [expression],
      sequences: [sequence],
    }

    const imported = parseImportedStudioDocument(serializeStudioDocument(document), document)

    expect(imported).toEqual(document)
    expect(imported.library.avatars[0].behavior?.expressions[0].widthLeft).toBe(42)
    expect(imported.expressions[0].semanticKey).toBe(initialExpressions[0].semanticKey)
    expect(imported.library.avatars[0].behavior?.expressions[0].semanticKey).toBe('happy-smile')
    expect(imported.library.avatars[0].behavior?.sequences[0].semanticKey).toBe('happy')
  })

  it('preserves semantic keys in the base behavior parser', () => {
    const document = documentFixture()
    document.expressions = document.expressions.map((expression, index) => ({
      ...expression,
      ...(index === 0 ? { semanticKey: 'attentive' } : {}),
    }))
    document.sequences = document.sequences.map((sequence, index) => ({
      ...sequence,
      ...(index === 0 ? { semanticKey: 'sleeping' } : {}),
    }))

    const imported = parseImportedStudioDocument(serializeStudioDocument(document), document)

    expect(imported.expressions[0].semanticKey).toBe('attentive')
    expect(imported.sequences[0].semanticKey).toBe('sleeping')
  })

  it('keeps the base library unchanged when an avatar owns customized behavior', () => {
    const document = documentFixture()
    const avatar = document.library.avatars[0]
    const customized = {
      ...avatar,
      behavior: {
        expressions: [{ ...initialExpressions[0], widthLeft: 47 }],
        sequences: createInitialSequences().slice(0, 1),
      },
    }
    const store = createStudioDocumentStore(document, () => undefined)

    const next = store.update({
      library: { activeAvatarId: avatar.id, avatars: [customized] },
    })

    expect(next.expressions[0].widthLeft).toBe(initialExpressions[0].widthLeft)
    expect(next.library.avatars[0].behavior?.expressions[0].widthLeft).toBe(47)
  })

  it('rejects files that are not versioned Studio projects', () => {
    const fallback = documentFixture()

    expect(() => parseImportedStudioDocument('{"version":1}', fallback)).toThrow(
      'Unsupported Avatar Studio project'
    )
    expect(() => parseImportedStudioDocument('{broken', fallback)).toThrow(
      'Invalid Avatar Studio project'
    )
  })

  it('repairs an imported active avatar and missing expression references', () => {
    const fallback = documentFixture()
    const avatar = createAvatar('Portable')
    const imported = parseImportedStudioDocument(
      JSON.stringify({
        ...fallback,
        library: { activeAvatarId: 'missing', avatars: [avatar] },
        sequences: [
          {
            ...createInitialSequences()[0],
            steps: [{ ...createInitialSequences()[0].steps[0], expressionId: 'missing' }],
          },
        ],
      }),
      fallback
    )

    expect(imported.library.activeAvatarId).toBe(avatar.id)
    expect(imported.sequences[0].steps[0].expressionId).toBe(imported.expressions[0].id)
  })

  it('sanitizes imported animation timing and playback values', () => {
    const fallback = documentFixture()
    const imported = parseImportedStudioDocument(
      JSON.stringify({
        ...fallback,
        sequences: [
          {
            ...fallback.sequences[0],
            playbackMode: 'unsupported',
            steps: [
              {
                ...fallback.sequences[0].steps[0],
                holdMs: -500,
                transitionMs: Number.POSITIVE_INFINITY,
              },
            ],
          },
        ],
      }),
      fallback
    )

    expect(imported.sequences[0].playbackMode).toBe('loop')
    expect(imported.sequences[0].steps[0].holdMs).toBeGreaterThanOrEqual(100)
    expect(Number.isFinite(imported.sequences[0].steps[0].transitionMs)).toBe(true)
  })
})
