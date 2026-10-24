import type { AvatarDefinition, AvatarExpressionDefinition } from './avatarDefinition'
import { surfacePresets } from './surfaces'

/** Default native virus. Studio edits and exports use the same surface and scene renderer. */
export function createVirusDefinition(): AvatarDefinition {
  const neutral: AvatarExpressionDefinition = {
    head: { x: 0, y: 0, z: 0 },
    eyes: {
      left: { width: 18, height: 34, x: 0, y: -7, angle: 0 },
      right: { width: 18, height: 34, x: 0, y: -7, angle: 0 },
      spacing: 32,
    },
    perspective: 1,
    motion: { eyes: 'none', body: 'none' },
  }
  return {
    schema: 'bible-strong/avatar-definition',
    schemaVersion: 1,
    name: 'Vivi',
    body: { primary: { ...surfacePresets.virus }, nodes: [] },
    colors: { body: '#aa83df', eyes: '#302347' },
    expressions: { neutral },
    expressionOrder: ['neutral'],
    animations: {},
    animationOrder: [],
  }
}
