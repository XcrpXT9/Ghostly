import {
  CircleGesture,
  distanceFromRect,
  jumpOffset,
  nearestDock,
  type AvatarDefinition,
  type Point,
} from '@bible-strong/avatar-core'
import { createAvatar, type AvatarController } from './index'
import { createVirus } from './virus'

export type CompanionState = {
  mode: 'following' | 'docked'
  side: 'left' | 'right' | null
  dizzy: boolean
  jumping: boolean
}
export type CompanionOptions = {
  /** Omit to use the procedural virus. */
  definition?: AvatarDefinition
  size?: number
  trail?: boolean
  dockSelector?: string
  releaseDistance?: number
  initialPosition?: Point
  onStateChange?: (state: CompanionState) => void
}
export type CompanionController = {
  getState(): CompanionState
  follow(): void
  dock(target: HTMLElement): void
  jump(): void
  dizzy(): void
  setAvatar(definition?: AvatarDefinition): void
  setSize(size: number): void
  setTrail(enabled: boolean): void
  destroy(): void
}

/** Mount once per page; the overlay never intercepts clicks. Call destroy on unmount. */
export function createCompanion(options: CompanionOptions = {}): CompanionController {
  const selector = options.dockSelector ?? '[data-mascot-dock]'
  // Validate a custom selector before creating nodes or subscribing to events.
  document.querySelector(selector)
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  let reduceMotion = media?.matches ?? false
  let size = Math.max(48, Math.min(220, options.size ?? 108))
  let trailEnabled = options.trail ?? true
  let destroyed = false
  let position = options.initialPosition ?? { x: window.innerWidth * 0.7, y: 240 }
  let pointer = { ...position }
  let docked: HTMLElement | null = null
  let side: 'left' | 'right' | null = null
  let dizzyUntil = 0
  let jumpStarted = -Infinity
  let previousTime = performance.now()
  let frameId = 0
  let lastState = ''
  const gesture = new CircleGesture()
  const host = document.createElement('div')
  host.dataset.companion = ''
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;contain:strict'
  const mover = document.createElement('div')
  mover.style.cssText = 'position:absolute;left:0;top:0;will-change:transform'
  const body = document.createElement('div')
  body.style.cssText = 'width:100%;height:100%;filter:drop-shadow(0 8px 7px #34235920)'
  const stars = document.createElement('div')
  stars.textContent = '✦   ✧   ✦'
  stars.style.cssText =
    'position:absolute;left:0;right:0;top:-8%;text-align:center;color:#8055ca;font:bold 22px sans-serif;display:none'
  mover.append(body, stars)
  const dots = Array.from({ length: 7 }, (_, i) => {
    const dot = document.createElement('span')
    dot.style.cssText = `position:absolute;left:0;top:0;width:${8 - i * 0.7}px;height:${8 - i * 0.7}px;border-radius:50%;background:#9c83d5;opacity:0;will-change:transform`
    host.append(dot)
    return { element: dot, position: { ...position } }
  })
  host.append(mover)
  let virus: ReturnType<typeof createVirus> | null = null
  let avatar: AvatarController | null = null
  let currentDefinition: AvatarDefinition | undefined
  let renderedMood = ''

  const state = (now = performance.now()): CompanionState => ({
    mode: docked ? 'docked' : 'following',
    side,
    dizzy: now < dizzyUntil,
    jumping: now - jumpStarted < 650,
  })
  const notify = (now?: number) => {
    const snapshot = state(now)
    host.dataset.mode = snapshot.mode
    host.dataset.dizzy = String(snapshot.dizzy)
    host.dataset.jumping = String(snapshot.jumping)
    const key = JSON.stringify(snapshot)
    if (key !== lastState) {
      lastState = key
      options.onStateChange?.(snapshot)
    }
  }
  const follow = () => {
    docked = null
    side = null
    gesture.reset()
    notify()
  }
  const dock = (target: HTMLElement) => {
    if (destroyed || !target.isConnected) return
    docked = target
    side = nearestDock(position, target.getBoundingClientRect()).side
    gesture.reset()
    notify()
  }
  const jump = () => {
    if (!destroyed) {
      jumpStarted = performance.now()
      notify()
    }
  }
  const dizzy = () => {
    if (!destroyed) {
      dizzyUntil = performance.now() + 3200
      gesture.reset()
      notify()
    }
  }
  const setAvatar = (definition?: AvatarDefinition) => {
    if (destroyed) return
    // Construct off-screen first, so invalid input leaves the working mascot intact.
    const next = document.createElement('div')
    next.style.cssText = 'width:100%;height:100%'
    const nextAvatar = definition ? createAvatar(next, { definition, size: '100%' }) : null
    const nextVirus = definition ? null : createVirus(next)
    avatar?.destroy()
    virus?.destroy()
    body.replaceChildren(next)
    avatar = nextAvatar
    virus = nextVirus
    currentDefinition = definition
    renderedMood = ''
  }
  const move = (event: PointerEvent) => {
    if (event.isPrimary === false) return
    pointer = { x: event.clientX, y: event.clientY }
    if (
      docked &&
      distanceFromRect(pointer, docked.getBoundingClientRect()) > (options.releaseDistance ?? 36)
    )
      follow()
    if (performance.now() >= dizzyUntil && gesture.push(pointer, performance.now())) dizzy()
  }
  const click = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest('button, [role="button"], a')
    const target = button?.closest<HTMLElement>(selector)
    if (target && !button?.hasAttribute('disabled')) dock(target)
  }
  const changeMotion = () => {
    reduceMotion = media?.matches ?? false
    gesture.reset()
  }
  const resetGesture = () => gesture.reset()

  const tick = (now: number) => {
    if (destroyed) return
    const delta = Math.min(Math.max(now - previousTime, 0), 50)
    previousTime = now
    if (docked && !docked.isConnected) follow()
    const rect = docked?.getBoundingClientRect()
    let target = rect
      ? { x: side === 'left' ? rect.left : rect.right, y: rect.top - size * 0.22 }
      : { x: pointer.x + size * 0.48, y: pointer.y + size * 0.48 }
    const half = size / 2
    target = {
      x: Math.max(half, Math.min(window.innerWidth - half, target.x)),
      y: Math.max(half, Math.min(window.innerHeight - half, target.y)),
    }
    const alpha = reduceMotion ? 1 : 1 - Math.exp(-delta / 95)
    position = {
      x: Math.max(
        half,
        Math.min(window.innerWidth - half, position.x + (target.x - position.x) * alpha)
      ),
      y: Math.max(
        half,
        Math.min(window.innerHeight - half, position.y + (target.y - position.y) * alpha)
      ),
    }
    const snapshot = state(now)
    const jumpY = reduceMotion ? 0 : jumpOffset(now - jumpStarted)
    const wobble = snapshot.dizzy && !reduceMotion ? Math.sin(now / 90) * 13 : 0
    mover.style.transform = `translate3d(${position.x - half}px,${position.y - half + jumpY}px,0)`
    body.style.transform = `rotate(${wobble}deg) scale(${snapshot.jumping && !reduceMotion ? 0.96 : 1},${snapshot.jumping && !reduceMotion ? 1.04 : 1})`
    stars.style.display = snapshot.dizzy ? 'block' : 'none'
    const gaze = {
      x: Math.tanh((pointer.x - position.x) / 80),
      y: Math.tanh((pointer.y - position.y) / 80),
    }
    virus?.render({ ...snapshot, time: now, gaze, reduceMotion })
    if (avatar && currentDefinition) {
      const mood = snapshot.dizzy ? 'dizzy' : snapshot.jumping ? 'surprised' : 'neutral'
      if (mood !== renderedMood) {
        const keys = Object.keys(currentDefinition.expressions)
        const expression =
          mood === 'dizzy'
            ? keys.find(key => /dizzy|confus|sick/i.test(key))
            : mood === 'surprised'
              ? keys.find(key => /surpris|shock|excit/i.test(key))
              : 'neutral'
        avatar.setExpression(expression ?? 'neutral')
        // Shared dizzy overlay also works with definitions lacking a dizzy expression.
        const svg = body.querySelector('svg')
        let overlay = svg?.querySelector('[data-dizzy-eyes]')
        if (svg && !overlay) {
          overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g')
          overlay.setAttribute('data-dizzy-eyes', '')
          overlay.innerHTML =
            '<g fill="none" stroke="#302347" stroke-width="4" stroke-linecap="round"><path d="M-39 -10c-17 -21 22 -29 21 -8s-30 21-29 0 39-24 39 4M28 -10c-17 -21 22 -29 21 -8s-30 21-29 0 39-24 39 4"/></g>'
          svg.append(overlay)
        }
        overlay?.setAttribute('visibility', snapshot.dizzy ? 'visible' : 'hidden')
        const eyeGroup = svg?.querySelector('g[clip-path]')
        eyeGroup?.setAttribute('visibility', snapshot.dizzy ? 'hidden' : 'visible')
        renderedMood = mood
      }
    }
    let leader = position
    dots.forEach((dot, i) => {
      const step = 1 - Math.exp(-delta / 45)
      dot.position.x += (leader.x - dot.position.x) * step
      dot.position.y += (leader.y - dot.position.y) * step
      const gap = Math.hypot(dot.position.x - position.x, dot.position.y - position.y)
      dot.element.style.opacity =
        trailEnabled && !reduceMotion && !docked && gap > size * 0.3
          ? String((1 - i / 8) * 0.38)
          : '0'
      dot.element.style.transform = `translate3d(${dot.position.x}px,${dot.position.y}px,0)`
      leader = dot.position
    })
    notify(now)
    frameId = requestAnimationFrame(tick)
  }
  const setSize = (next: number) => {
    if (!Number.isFinite(next)) return
    size = Math.max(48, Math.min(220, next))
    mover.style.width = `${size}px`
    mover.style.height = `${size}px`
  }
  setAvatar(options.definition)
  setSize(size)
  document.body.append(host)
  document.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('click', click)
  document.addEventListener('dblclick', jump)
  document.addEventListener('visibilitychange', resetGesture)
  window.addEventListener('blur', resetGesture)
  media?.addEventListener('change', changeMotion)
  frameId = requestAnimationFrame(tick)
  notify()
  return {
    getState: state,
    follow,
    dock,
    jump,
    dizzy,
    setAvatar,
    setSize,
    setTrail: enabled => {
      trailEnabled = enabled
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(frameId)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('click', click)
      document.removeEventListener('dblclick', jump)
      document.removeEventListener('visibilitychange', resetGesture)
      window.removeEventListener('blur', resetGesture)
      media?.removeEventListener('change', changeMotion)
      avatar?.destroy()
      virus?.destroy()
      host.remove()
    },
  }
}
