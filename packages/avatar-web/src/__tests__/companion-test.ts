// @vitest-environment jsdom
import { createCompanion } from '../companion'

describe('website companion', () => {
  let tick: FrameRequestCallback
  beforeEach(() => {
    document.body.innerHTML = '<article data-mascot-dock><button>Dock</button></article>'
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      tick = callback
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.spyOn(performance, 'now').mockReturnValue(0)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('docks through nested buttons and releases when the pointer moves away', () => {
    const card = document.querySelector('article')!
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 400,
      top: 200,
      bottom: 500,
      width: 300,
      height: 300,
      x: 100,
      y: 200,
      toJSON: () => ({}),
    })
    const companion = createCompanion({ initialPosition: { x: 380, y: 200 } })
    document.querySelector('button')!.click()
    expect(companion.getState()).toMatchObject({ mode: 'docked', side: 'right' })
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 320, clientY: 250 }))
    expect(companion.getState().mode).toBe('docked')
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 600, clientY: 550 }))
    expect(companion.getState().mode).toBe('following')
    companion.destroy()
  })

  it('jumps on double-click, lands, and cleans up events and its overlay', () => {
    const companion = createCompanion()
    document.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(companion.getState().jumping).toBe(true)
    vi.spyOn(performance, 'now').mockReturnValue(700)
    tick(700)
    expect(companion.getState().jumping).toBe(false)
    companion.destroy()
    document.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(document.querySelector('[data-companion]')).toBeNull()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })

  it('releases a removed docking target', () => {
    const companion = createCompanion()
    document.querySelector('button')!.click()
    document.querySelector('article')!.remove()
    tick(100)
    expect(companion.getState().mode).toBe('following')
    companion.destroy()
  })

  it('keeps the mascot inside the viewport immediately after resizing', () => {
    const companion = createCompanion({ initialPosition: { x: 900, y: 600 }, size: 108 })
    vi.stubGlobal('innerWidth', 320)
    vi.stubGlobal('innerHeight', 480)
    tick(16)
    const transform = document.querySelector<HTMLElement>('[data-companion] > div')!.style.transform
    const [x, y] = transform.match(/-?\d+(?:\.\d+)?(?=px)/g)!.map(Number)
    expect(x).toBeLessThanOrEqual(212)
    expect(y).toBeLessThanOrEqual(372)
    companion.destroy()
  })
})
