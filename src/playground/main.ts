import './styles.css'
import {
  createAvatar,
  createCompanion,
  createVirus,
  type CompanionState,
} from '../../packages/avatar-web/src/index'
import { createAvatarDefinition } from '../features/avatar/avatarDefinition'
import { resolveAvatarBehavior } from '../features/avatar/avatars'
import { loadStudioDocument } from '../features/studio/studioDocument'

const find = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const studio = loadStudioDocument({ getItem: () => null })
const choices = studio.library.avatars.map(avatar => {
  const definition = createAvatarDefinition({
    avatar,
    behavior: resolveAvatarBehavior(avatar, studio),
  })
  if (!definition.ok)
    throw new Error(
      `Could not load ${avatar.name}: ${definition.errors.map(error => error.message).join(', ')}`
    )
  return { name: avatar.name, definition: definition.value }
})
const characters = [{ name: 'Vivi', definition: undefined }, ...choices]
let selected = 0
let currentState: CompanionState = { mode: 'following', side: null, dizzy: false, jumping: false }
const companion = createCompanion({
  initialPosition: { x: window.innerWidth - 150, y: 180 },
  onStateChange(state) {
    currentState = state
    find('behavior').textContent = state.dizzy
      ? 'Feeling a little dizzy'
      : state.jumping
        ? 'A little leap of joy'
        : state.mode === 'docked'
          ? `Docked at the top ${state.side}`
          : 'Following your cursor'
    find('character-name').textContent =
      `${characters[selected].name} ${state.mode === 'docked' ? 'found a place to perch' : 'is exploring'}`
  },
})
const thumbnails: { destroy(): void }[] = []
let preview: { destroy(): void } | null = null
let virusPreview: ReturnType<typeof createVirus> | null = null
const shelf = find('character-shelf')
function select(index: number) {
  selected = index
  const character = characters[index]
  companion.setAvatar(character.definition)
  preview?.destroy()
  find('specimen-preview').replaceChildren()
  virusPreview = index === 0 ? createVirus(find('specimen-preview')) : null
  preview =
    virusPreview ??
    createAvatar(find('specimen-preview'), { definition: character.definition, size: '100%' })
  find('specimen-title').textContent = index === 0 ? 'Vivi the virus' : character.name
  find('specimen-description').textContent =
    index === 0
      ? 'A soft little oddball with a life of its own.'
      : 'An original character, ready for a new adventure.'
  find('specimen-kind').textContent =
    index === 0 ? 'Procedural organism' : 'Original Avatar Lab mascot'
  find('character-name').textContent =
    `${character.name} is ${currentState.mode === 'docked' ? 'perched nearby' : 'exploring'}`
  document.querySelectorAll<HTMLElement>('.annotation').forEach(node => {
    node.hidden = index !== 0
    node.style.display = index === 0 ? '' : 'none'
  })
  shelf
    .querySelectorAll('button')
    .forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)))
}
characters.forEach((character, index) => {
  const button = document.createElement('button')
  button.className = 'character'
  button.setAttribute('aria-pressed', String(index === 0))
  button.setAttribute('aria-label', `Choose ${character.name}`)
  const picture = document.createElement('span')
  picture.className = 'character-preview'
  picture.setAttribute('aria-hidden', 'true')
  const name = document.createElement('span')
  name.textContent = character.name
  button.append(picture, name)
  if (index === 0) {
    const tag = document.createElement('span')
    tag.className = 'new-tag'
    tag.textContent = 'New'
    button.append(tag)
  }
  thumbnails.push(
    character.definition
      ? createAvatar(picture, { definition: character.definition, size: '100%' })
      : createVirus(picture)
  )
  button.addEventListener('click', () => select(index))
  shelf.append(button)
})
find('character-count').textContent = `${characters.length} companions`
select(0)
find('size').addEventListener('input', event => {
  const value = Number((event.target as HTMLInputElement).value)
  companion.setSize(value)
  find('size-output').textContent = `${value} px`
})
find('trail').addEventListener('change', event =>
  companion.setTrail((event.target as HTMLInputElement).checked)
)
find('follow').addEventListener('click', () => companion.follow())
find('dizzy').addEventListener('click', () => companion.dizzy())
find('jump').addEventListener('click', () => companion.jump())
const media = window.matchMedia('(prefers-reduced-motion: reduce)')
let frame = 0
function animate(time: number) {
  virusPreview?.render({ ...currentState, time, gaze: { x: 0, y: 0 }, reduceMotion: media.matches })
  frame = requestAnimationFrame(animate)
}
frame = requestAnimationFrame(animate)
window.addEventListener('pagehide', event => {
  if (event.persisted) return
  cancelAnimationFrame(frame)
  companion.destroy()
  preview?.destroy()
  thumbnails.forEach(item => item.destroy())
})
