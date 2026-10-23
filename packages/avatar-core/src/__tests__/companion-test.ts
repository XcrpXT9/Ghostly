import { CircleGesture, nearestDock, jumpOffset, membranePoint } from '../companion'

describe('companion gestures and geometry', () => {
  function circle(detector: CircleGesture, turns: number, direction = 1, start = 0) {
    let triggered = false
    for (let i = 0; i <= turns * 100; i++) {
      const angle = (i / 100) * Math.PI * 2 * direction
      triggered =
        detector.push(
          { x: 240 + 70 * Math.cos(angle), y: 240 + 70 * Math.sin(angle) },
          start + i * 20
        ) || triggered
    }
    return triggered
  }

  it.each([1, -1])('requires two full rotations in direction %s', direction => {
    expect(circle(new CircleGesture(), 1.99, direction)).toBe(false)
    expect(circle(new CircleGesture(), 2, direction)).toBe(true)
  })

  it('does not treat straight lines, jitter or backtracking as circles', () => {
    for (const kind of ['line', 'jitter', 'backtrack']) {
      const detector = new CircleGesture()
      let triggered = false
      for (let i = 0; i < 250; i++) {
        const angle = Math.sin(i / 20) * Math.PI
        const point =
          kind === 'line'
            ? { x: i * 3, y: 100 }
            : kind === 'jitter'
              ? { x: 100 + Math.sin(i) * 4, y: 100 + Math.cos(i) * 4 }
              : { x: 200 + Math.cos(angle) * 70, y: 200 + Math.sin(angle) * 70 }
        triggered ||= detector.push(point, i * 20)
      }
      expect(triggered).toBe(false)
    }
  })

  it('forgets a partial circle after a pause', () => {
    const detector = new CircleGesture()
    expect(circle(detector, 1)).toBe(false)
    expect(circle(detector, 1, 1, 5000)).toBe(false)
  })

  it('selects the corner closest to the mascot', () => {
    const rect = { left: 100, right: 400, top: 200, bottom: 500 }
    expect(nearestDock({ x: 110, y: 120 }, rect).side).toBe('left')
    expect(nearestDock({ x: 380, y: 120 }, rect)).toEqual({ x: 400, y: 200, side: 'right' })
  })

  it('jumps up and returns precisely to the original anchor', () => {
    expect(jumpOffset(0)).toBe(0)
    expect(jumpOffset(325)).toBeCloseTo(-72)
    expect(jumpOffset(650)).toBe(0)
    expect(jumpOffset(1000)).toBe(0)
  })

  it('keeps the membrane periodic, irregular and moving', () => {
    const first = membranePoint(0, 0)
    const seam = membranePoint(Math.PI * 2, 0)
    expect(seam.x).toBeCloseTo(first.x)
    expect(seam.y).toBeCloseTo(first.y)
    expect(membranePoint(0, 1000)).not.toEqual(first)
    expect(Math.hypot(first.x, first.y)).not.toBeCloseTo(
      Math.hypot(...Object.values(membranePoint(1, 0)))
    )
  })
})
