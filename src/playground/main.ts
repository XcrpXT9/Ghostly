import './styles.css'
import {
  createAvatar,
  createCompanion,
  type CompanionState,
} from '../../packages/avatar-web/src/index'
import { createAvatarDefinition } from '../features/avatar/avatarDefinition'
import { resolveAvatarBehavior } from '../features/avatar/avatars'
import { loadStudioDocument } from '../features/studio/studioDocument'

const find = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const studio = loadStudioDocument()
const choices = studio.library.avatars.map(avatar => {
  const candidate = createAvatarDefinition({
    avatar,
    behavior: resolveAvatarBehavior(avatar, studio),
  })
  const definition = candidate.ok
    ? candidate
    : createAvatarDefinition({ avatar, behavior: { expressions: [], sequences: [] } })
  if (!definition.ok)
    throw new Error(
      `Could not load ${avatar.name}: ${definition.errors.map(error => error.message).join(', ')}`
    )
  return { id: avatar.id, name: avatar.name, definition: definition.value }
})
const characters = choices
const requested =
  new URLSearchParams(window.location.search).get('avatar') ?? studio.library.activeAvatarId
let selected = Math.max(
  0,
  characters.findIndex(character => character.id === requested)
)
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
const shelf = find('character-shelf')
function select(index: number) {
  selected = index
  const character = characters[index]
  companion.setAvatar(character.definition)
  preview?.destroy()
  find('specimen-preview').replaceChildren()
  preview = createAvatar(find('specimen-preview'), {
    definition: character.definition,
    size: '100%',
  })
  const isVirus = character.definition.body.primary.type === 'virus'
  document.querySelector<HTMLAnchorElement>('nav a')!.href =
    `./index.html?avatar=${encodeURIComponent(character.id)}`
  find('specimen-title').textContent = character.name
  find('specimen-description').textContent = isVirus
    ? 'A soft little oddball with a life of its own.'
    : 'An original character, ready for a new adventure.'
  find('specimen-kind').textContent = isVirus ? 'Native virus avatar' : 'Studio avatar'
  find('character-name').textContent =
    `${character.name} is ${currentState.mode === 'docked' ? 'perched nearby' : 'exploring'}`
  document.querySelectorAll<HTMLElement>('.annotation').forEach(node => {
    node.hidden = !isVirus
    node.style.display = isVirus ? '' : 'none'
  })
  shelf
    .querySelectorAll('button')
    .forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)))
}
characters.forEach((character, index) => {
  const button = document.createElement('button')
  button.className = 'character'
  button.setAttribute('aria-pressed', String(index === selected))
  button.setAttribute('aria-label', `Choose ${character.name}`)
  const picture = document.createElement('span')
  picture.className = 'character-preview'
  picture.setAttribute('aria-hidden', 'true')
  const name = document.createElement('span')
  name.textContent = character.name
  button.append(picture, name)
  if (character.id === 'vivi') {
    const tag = document.createElement('span')
    tag.className = 'new-tag'
    tag.textContent = 'New'
    button.append(tag)
  }
  thumbnails.push(createAvatar(picture, { definition: character.definition, size: '100%' }))
  button.addEventListener('click', () => select(index))
  shelf.append(button)
})
find('character-count').textContent = `${characters.length} companions`
select(selected)
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
// Refresh shared Studio data when returning from the editor in another tab.
let savedProject: string | null = null
try {
  savedProject = localStorage.getItem('bible-strong-avatar-studio-v2')
} catch {
  /* Storage may be unavailable. */
}
window.addEventListener('focus', () => {
  try {
    if (localStorage.getItem('bible-strong-avatar-studio-v2') !== savedProject) location.reload()
  } catch {
    /* The in-memory library remains usable. */
  }
})
window.addEventListener('pagehide', event => {
  if (event.persisted) return
  companion.destroy()
  preview?.destroy()
  thumbnails.forEach(item => item.destroy())
})
