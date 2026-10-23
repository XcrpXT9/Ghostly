import { membranePoint, type Point } from '@bible-strong/avatar-core'

export type VirusFrame = {
  time: number
  dizzy: boolean
  jumping: boolean
  gaze: Point
  reduceMotion: boolean
}
const ns = 'http://www.w3.org/2000/svg'
let nextId = 0

/** A procedural companion renderer; it does not alter the Studio JSON surface schema. */
export function createVirus(target: HTMLElement) {
  const id = `virus-${++nextId}`
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '-110 -110 220 220')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', 'Vivi, a fluid virus mascot')
  svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible'
  svg.innerHTML = `<defs>
    <radialGradient id="${id}-body" cx="30%" cy="24%" r="85%"><stop stop-color="#e5d7ff"/><stop offset=".48" stop-color="#bb96ef"/><stop offset="1" stop-color="#8055ca"/></radialGradient>
    <linearGradient id="${id}-protein" x2="1" y2="1"><stop stop-color="#d3b5ff"/><stop offset="1" stop-color="#8356bd"/></linearGradient>
  </defs>
  <g data-proteins fill="none" stroke="url(#${id}-protein)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"></g>
  <path data-membrane fill="url(#${id}-body)" stroke="#7046ad" stroke-width="2"/>
  <path data-inner fill="none" stroke="#f3e8ff" stroke-opacity=".48" stroke-width="1.5" transform="scale(.89)"/>
  <g fill="#7046ad" opacity=".2"><circle cx="-34" cy="20" r="7"/><circle cx="28" cy="-35" r="5"/><circle cx="37" cy="20" r="9"/><circle cx="-17" cy="-37" r="4"/><circle cx="6" cy="39" r="5"/></g>
  <path d="M-43 -24 Q-39 -43 -19 -46" fill="none" stroke="#fff" stroke-opacity=".48" stroke-width="7" stroke-linecap="round"/>
  <g data-face>
    <g data-eyes fill="#302347"><ellipse cx="-21" cy="-5" rx="7" ry="12"/><ellipse cx="21" cy="-5" rx="7" ry="12"/></g>
    <g data-sparkles fill="#fff"><circle cx="-23" cy="-9" r="2"/><circle cx="19" cy="-9" r="2"/></g>
    <g data-spirals fill="none" stroke="#302347" stroke-width="3" stroke-linecap="round"></g>
    <path data-mouth d="M-8 16 Q0 24 8 16" fill="none" stroke="#302347" stroke-width="3" stroke-linecap="round"/>
    <g fill="#e584b8" opacity=".65"><ellipse cx="-33" cy="11" rx="9" ry="4"/><ellipse cx="33" cy="11" rx="9" ry="4"/></g>
  </g>`
  const membrane = svg.querySelector('[data-membrane]')!
  const inner = svg.querySelector('[data-inner]')!
  const face = svg.querySelector('[data-face]')!
  const eyes = svg.querySelector('[data-eyes]')!
  const sparkles = svg.querySelector('[data-sparkles]')!
  const spirals = svg.querySelector('[data-spirals]')!
  const mouth = svg.querySelector('[data-mouth]')!
  for (const x of [-21, 21]) {
    const path = document.createElementNS(ns, 'path')
    const points = Array.from({ length: 55 }, (_, i) => {
      const angle = (i / 54) * Math.PI * 4
      const radius = 1 + (i / 54) * 10
      return `${i ? 'L' : 'M'}${x + Math.cos(angle) * radius} ${-5 + Math.sin(angle) * radius}`
    })
    path.setAttribute('d', points.join(' '))
    spirals.append(path)
  }
  const proteins = Array.from({ length: 17 }, (_, i) => {
    const path = document.createElementNS(ns, 'path')
    path.setAttribute(
      'd',
      i % 3 === 0
        ? 'M0 1V-18M-8 -24L0 -17L8 -24'
        : i % 3 === 1
          ? 'M0 1V-18M-7 -18H7'
          : 'M0 1V-16M-4 -21a4 4 0 1 0 8 0a4 4 0 1 0 -8 0'
    )
    svg.querySelector('[data-proteins]')!.append(path)
    return path
  })
  target.append(svg)
  const render = ({ time, dizzy, jumping, gaze, reduceMotion }: VirusFrame) => {
    const t = reduceMotion ? 0 : time
    const points = Array.from({ length: 96 }, (_, i) => membranePoint((i / 96) * Math.PI * 2, t))
    // Dense periodic samples give a continuous, closed, gently undulating membrane.
    const d =
      points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z'
    membrane.setAttribute('d', d)
    inner.setAttribute('d', d)
    proteins.forEach((path, i) => {
      const angle = (i / proteins.length) * Math.PI * 2
      const p = membranePoint(angle, t)
      const sway = reduceMotion ? 0 : Math.sin(t / 650 + i * 2) * 9
      path.setAttribute(
        'transform',
        `translate(${p.x} ${p.y}) rotate(${(angle * 180) / Math.PI + 90 + sway}) scale(${0.8 + (i % 4) * 0.1})`
      )
    })
    face.setAttribute('transform', `translate(${gaze.x * 4} ${gaze.y * 3})`)
    eyes.setAttribute('visibility', dizzy ? 'hidden' : 'visible')
    sparkles.setAttribute('visibility', dizzy ? 'hidden' : 'visible')
    spirals.setAttribute('visibility', dizzy ? 'visible' : 'hidden')
    mouth.setAttribute(
      'd',
      dizzy
        ? 'M-9 18 Q-4 11 0 18 T9 18'
        : jumping
          ? 'M-5 18a5 7 0 1 0 10 0a5 7 0 1 0 -10 0'
          : 'M-8 16 Q0 24 8 16'
    )
  }
  render({ time: 0, dizzy: false, jumping: false, gaze: { x: 0, y: 0 }, reduceMotion: false })
  return { render, destroy: () => svg.remove() }
}
