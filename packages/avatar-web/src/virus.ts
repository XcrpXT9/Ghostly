import {
  createVirusDefinition,
  expressionFromDefinition,
  renderAvatarExpression,
  type Point,
} from '@bible-strong/avatar-core'

export type VirusFrame = {
  time: number
  dizzy: boolean
  jumping: boolean
  gaze: Point
  reduceMotion: boolean
}

/** Compatibility helper backed by the same native geometry used by Studio and exported avatars. */
export function createVirus(target: HTMLElement) {
  const definition = createVirusDefinition()
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '-150 -150 300 300')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', 'Vivi')
  svg.style.cssText = 'display:block;width:100%;height:100%'
  const paths = Array.from({ length: 4 }, () => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    svg.append(path)
    return path
  })
  target.append(svg)
  const render = (frame: VirusFrame) => {
    const expression = expressionFromDefinition('neutral', definition.expressions.neutral)
    expression.positionXLeft += frame.gaze.x * 3
    expression.positionXRight += frame.gaze.x * 3
    expression.positionYLeft += frame.gaze.y * 3
    expression.positionYRight += frame.gaze.y * 3
    expression.leftAngle = frame.dizzy ? 35 : 0
    expression.rightAngle = frame.dizzy ? -35 : 0
    if (frame.jumping) expression.heightLeft = expression.heightRight = 43
    const { geometry, colors } = renderAvatarExpression(
      definition,
      expression,
      {},
      1,
      frame.reduceMotion ? 0 : frame.time
    )
    const values = [
      geometry.backPaths.join(' '),
      geometry.headPath,
      geometry.leftPath,
      geometry.rightPath,
    ]
    paths.forEach((path, index) => {
      path.setAttribute('d', values[index])
      path.setAttribute('fill', index < 2 ? colors.body : colors.eyes)
    })
  }
  render({ time: 0, dizzy: false, jumping: false, gaze: { x: 0, y: 0 }, reduceMotion: false })
  return { render, destroy: () => svg.remove() }
}
