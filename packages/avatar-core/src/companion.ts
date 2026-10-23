/** Framework-independent website interaction and fluid membrane geometry. */
export type Point = { x: number; y: number }
export type DockRect = { left: number; right: number; top: number; bottom: number }

export function nearestDock(position: Point, rect: DockRect) {
  const side =
    Math.abs(position.x - rect.left) <= Math.abs(position.x - rect.right) ? 'left' : 'right'
  return { x: side === 'left' ? rect.left : rect.right, y: rect.top, side } as const
}

export function distanceFromRect(point: Point, rect: DockRect) {
  return Math.hypot(
    Math.max(rect.left - point.x, 0, point.x - rect.right),
    Math.max(rect.top - point.y, 0, point.y - rect.bottom)
  )
}

export function jumpOffset(elapsedMs: number) {
  return elapsedMs <= 0 || elapsedMs >= 650 ? 0 : -72 * Math.sin((elapsedMs / 650) * Math.PI)
}

export function membranePoint(angle: number, timeMs: number): Point {
  const t = timeMs / 1000
  const radius =
    66 +
    5 * Math.sin(3 * angle + t * 1.3) +
    3.5 * Math.cos(5 * angle - t) +
    2 * Math.sin(7 * angle + t * 0.7)
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.93 }
}

export class CircleGesture {
  private points: (Point & { time: number })[] = []

  reset() {
    this.points = []
  }

  push(point: Point, time: number): boolean {
    const last = this.points.at(-1)
    if (last && time - last.time > 800) this.reset()
    else if (last && Math.hypot(point.x - last.x, point.y - last.y) < 3) return false
    this.points.push({ ...point, time })
    this.points = this.points.filter(sample => time - sample.time <= 6000).slice(-720)
    if (this.points.length < 24) return false
    const xs = this.points.map(p => p.x)
    const ys = this.points.map(p => p.y)
    const width = Math.max(...xs) - Math.min(...xs)
    const height = Math.max(...ys) - Math.min(...ys)
    if (Math.min(width, height) < 36 || Math.max(width, height) / Math.min(width, height) > 3)
      return false
    const center = {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
    let signed = 0
    let total = 0
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]
      const b = this.points[i]
      const delta =
        Math.atan2(b.y - center.y, b.x - center.x) - Math.atan2(a.y - center.y, a.x - center.x)
      const wrapped = Math.atan2(Math.sin(delta), Math.cos(delta))
      // Center crossings and sparse jumps must not count as circular travel.
      if (
        Math.abs(wrapped) > 0.8 ||
        Math.hypot(b.x - center.x, b.y - center.y) < Math.min(width, height) * 0.2
      )
        return false
      signed += wrapped
      total += Math.abs(wrapped)
    }
    if (Math.abs(signed) >= Math.PI * 4 - 1e-6 && Math.abs(signed) / total > 0.9) {
      this.reset()
      return true
    }
    return false
  }
}
