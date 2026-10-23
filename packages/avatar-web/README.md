# @bible-strong/avatar-web

DOM renderer for Bible Strong procedural avatars. It uses `@bible-strong/avatar-core` for schema
validation, playback and rendering, without requiring React.

```sh
pnpm add @bible-strong/avatar-web
```

```js
import { createAvatar } from '@bible-strong/avatar-web'
import definition from './cloudee.avatar.json'

const avatar = createAvatar('#avatar', {
  definition,
  defaultAnimation: 'idle',
})

avatar.play('happy')
avatar.pause()
avatar.stop()
```

For a browser project without a bundler, load an ESM build through an import map or CDN and fetch
the definition JSON before calling `createAvatar`.

The package follows Semantic Versioning. While it remains below `1.0.0`, breaking API changes
increment the minor version and fixes increment the patch version.

# Website companions

`createCompanion` adds cursor following, automatic UI docking, circle detection, dizziness, and
double-click jumping to any website. It creates a fixed SVG overlay with `pointer-events: none`, so
underlying controls remain clickable. No React dependency or stylesheet import is required.

```html
<article data-mascot-dock>
  <h2>A place to perch</h2>
  <button>Dock here</button>
</article>
```

```ts
import { createCompanion } from '@bible-strong/avatar-web'

// Omitting definition selects Vivi, the procedural fluid virus.
const companion = createCompanion({
  size: 108,
  trail: true,
  dockSelector: '[data-mascot-dock]',
  releaseDistance: 36,
  onStateChange: state => console.log(state),
})

// Or pass your existing .avatar.json definition at construction or later:
// companion.setAvatar(definition)
companion.jump()
// On page/component teardown:
companion.destroy()
```

Mark a card or an individual button with `data-mascot-dock`. A delegated button/link click docks
at the top corner nearest the mascot. Moving the pointer beyond the target's 36px outer margin
releases it. Docking tracks scroll and resize; removing a target also releases the mascot.
Anchors are clamped to the viewport to keep the character visible near screen edges.

Two full circles in either direction within six seconds trigger 3.2 seconds of dizziness. Tiny
jitter, straight lines, backtracking, and movements separated by more than 800 ms are ignored.
Double-clicking jumps for 650 ms, independently of docking and dizziness. A falling jump always
returns to the current anchor.

The controller also exposes `follow()`, `dock(element)`, `dizzy()`, `setSize(48..220)`,
`setTrail(boolean)`, and `getState()`. State contains `mode`, `side`, `dizzy`, and `jumping`.
Provide accessible buttons for these methods when supporting keyboard or touch users. Install
one companion per page, and call `destroy()` to remove its listeners, SVG, and animation frame.
Call the API in the browser after `document.body` exists; in React, mount and destroy in an effect.

System reduced-motion preferences are observed live: expressions still change, following snaps
to its destination, and membrane movement, jump displacement, wobble, and trails are disabled.
Vivi is a runtime SVG character and is not serialized into the Studio's body-surface schema.
`createVirus(target)` is also exported for standalone rendering; it returns `render(frame)` and
`destroy()`. The caller supplies time and owns its animation frame.
