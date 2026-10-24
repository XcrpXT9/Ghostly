import {
  createAvatarDefinition,
  validateAvatarDefinition,
  createAvatarPlaybackState,
  renderAvatarFrame,
} from '../avatarDefinition'
import { resolveAvatarBehavior } from '../avatars'
import {
  loadStudioDocument,
  parseImportedStudioDocument,
  serializeStudioDocument,
} from '../../studio/studioDocument'

describe('native virus integration', () => {
  it('includes an editable virus in the Studio library and exports its actual body', () => {
    const studio = loadStudioDocument({ getItem: () => null })
    const virus = studio.library.avatars.find(avatar => avatar.id === 'vivi')!
    expect(virus).toBeDefined()
    expect(virus.body.primary.type).toBe('virus')
    const definition = createAvatarDefinition({
      avatar: virus,
      behavior: resolveAvatarBehavior(virus, studio),
    })
    expect(definition.ok).toBe(true)
    if (!definition.ok) throw new Error('Invalid native virus')
    expect(validateAvatarDefinition(JSON.parse(JSON.stringify(definition.value))).ok).toBe(true)
    const state = createAvatarPlaybackState()
    const env = { random: () => 0.5, reduceMotion: false }
    const first = renderAvatarFrame(definition.value, state, 0, env)
    const later = renderAvatarFrame(definition.value, state, 1000, env)
    expect(first.geometry.headPath).not.toBe(later.geometry.headPath)
    expect(first.geometry.backPaths[0]).not.toBe(later.geometry.backPaths[0])
    expect(first.geometry.leftPath).not.toBe('')
    expect(renderAvatarFrame(definition.value, state, 0, { ...env, reduceMotion: true })).toEqual(
      renderAvatarFrame(definition.value, state, 1000, { ...env, reduceMotion: true })
    )
  })

  it('preserves virus edits and independent duplicates through a project round trip', () => {
    const studio = loadStudioDocument({ getItem: () => null })
    const virus = studio.library.avatars.find(avatar => avatar.id === 'vivi')!
    expect(virus).toBeDefined()
    virus.colors.body = '#bb4488'
    virus.body.primary.width = 215
    const copy = { ...structuredClone(virus), id: 'vivi-copy', name: 'Vivi copy' }
    copy.body.primary.width = 190
    studio.library.avatars.push(copy)
    const restored = parseImportedStudioDocument(serializeStudioDocument(studio), studio)
    expect(
      restored.library.avatars.find(avatar => avatar.id === 'vivi')?.body.primary
    ).toMatchObject({ type: 'virus', width: 215 })
    expect(restored.library.avatars.find(avatar => avatar.id === copy.id)?.body.primary.width).toBe(
      190
    )
  })

  it('adds Vivi to an existing project once, preserving selection, custom avatars and deliberate removal', () => {
    const legacy = loadStudioDocument({ getItem: () => null })
    legacy.library.avatars = legacy.library.avatars.filter(avatar => avatar.id !== 'vivi')
    delete legacy.bundledAvatarVersion
    const original = structuredClone(legacy.library)
    const upgraded = loadStudioDocument({ getItem: () => JSON.stringify(legacy) })
    expect(upgraded.library.avatars.filter(avatar => avatar.id === 'vivi')).toHaveLength(1)
    expect(upgraded.library.activeAvatarId).toBe(original.activeAvatarId)
    expect(upgraded.library.avatars.filter(avatar => avatar.id !== 'vivi')).toEqual(
      original.avatars
    )
    upgraded.library.avatars = upgraded.library.avatars.filter(avatar => avatar.id !== 'vivi')
    expect(
      loadStudioDocument({ getItem: () => JSON.stringify(upgraded) }).library.avatars.some(
        avatar => avatar.id === 'vivi'
      )
    ).toBe(false)
  })
})
