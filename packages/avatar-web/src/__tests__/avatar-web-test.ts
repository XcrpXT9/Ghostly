// @vitest-environment jsdom

import definitionJson from '../../../../examples/react-vite-consumer/src/strobi.avatar.json'
import { createAvatar } from '../index'
import { createVirusDefinition } from '@bible-strong/avatar-core'

describe('@bible-strong/avatar-web', () => {
  it('animates the native virus at rest and freezes it when paused', () => {
    let tick: FrameRequestCallback = () => {}
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      tick = callback
      return 1
    })
    const avatar = createAvatar('#avatar', { definition: createVirusDefinition() })
    const head = document.querySelector('#avatar clipPath path')!
    const first = head.getAttribute('d')
    tick(1000)
    expect(head.getAttribute('d')).not.toBe(first)
    avatar.pause()
    expect(avatar.getState().status).toBe('paused')
    expect(cancelAnimationFrame).toHaveBeenCalled()
    avatar.setExpression('neutral')
    expect(avatar.getState().status).toBe('stopped')
    avatar.destroy()
  })
  beforeEach(() => {
    document.body.innerHTML = '<div id="avatar"></div>'
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('mounts the shared avatar definition without React', () => {
    const avatar = createAvatar('#avatar', {
      definition: definitionJson,
      defaultExpression: 'neutral',
      size: 180,
    })

    expect(document.querySelector('#avatar svg')).not.toBeNull()
    expect(document.querySelectorAll('#avatar svg > path')).toHaveLength(37)
    expect(document.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Procedural avatar'
    )
    expect(avatar.getState()).toMatchObject({
      activeExpression: 'neutral',
      status: 'stopped',
    })

    avatar.destroy()
    expect(document.querySelector('#avatar svg')).toBeNull()
  })

  it('returns typed errors for unknown targets', () => {
    const avatar = createAvatar('#avatar', { definition: definitionJson })

    expect(avatar.play('missing')).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'unknown_animation', key: 'missing' }),
    })
    expect(avatar.setExpression('missing')).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'unknown_expression', key: 'missing' }),
    })
  })
})
