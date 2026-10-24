# Website companion and playground

The existing Studio authors avatars; the core package calculates geometry and playback; the web
package mounts avatars without React. Add website behavior to the web package and pure gesture and
membrane calculations to core. Keep existing Studio documents and exports compatible.

## Interaction contract

- Follow the pointer with frame-rate-independent easing and a small offset so controls stay usable.
- Clicking a button inside `[data-mascot-dock]` attaches the mascot to that container's nearest top
  corner, measured from the mascot's position. The same attribute can be placed on a button itself.
- The user requested automatic release when moving away. Release beyond a 36px margin around the
  target. Continue tracking the target through scrolling and resizing; release removed targets.
- Two complete same-direction circles in a rolling six-second window trigger temporary dizziness.
  Ignore tiny jitter, straight movement, backtracking, and motion separated by a long pause.
- Double-click anywhere jumps in place and lands back on the current following/docking anchor.
- Dizziness, jumping, and docking compose independently. Reduced motion keeps expressions and
  docking but removes wobble, fluid animation, trails, and jump displacement.
- A controller owns event subscriptions and animation frames and exposes explicit destruction.

## Visual and playground choices

Use a pale blue laboratory canvas (#f3f6fc), white surfaces, ink (#202d48), cobalt (#3659dd), and
purple (#8055ca). System sans-serif UI, with a large compact heading. A varied bento layout provides
actual docking targets. The live mascot is the main visual, with a large stationary specimen preview
and a selectable shelf of the repository's bundled characters.

The new virus is an SVG renderer with a periodically sampled irregular membrane. Y-shaped, forked,
and round-tipped proteins share its moving boundary. Expressions include tracking eyes, spiral eyes,
and a surprised jumping face. It is a native Studio `virus` surface, rendered by shared core geometry across Studio, React, web, and companion integrations.

Deliver a separate Vite HTML entry at `/playground.html`, included in production builds, with size
and trail controls, keyboard-accessible action buttons, current behavior feedback, and instructions.
The playground reads the saved Studio document and selected avatar. The Studio exposes companion controls and a link to test the selected avatar. Existing projects receive Vivi once, preserving their selection and custom work; a persisted catalog marker prevents resurrection after deletion.

## Verification

Focused Vitest tests cover rotations in both directions, false positives, pauses, nearest corners,
jump landing, fluid seam continuity, delegated clicks, automatic undocking, removed targets and
cleanup. Run typechecking and the full repository check, then exercise the production playground
in a real browser at desktop and mobile widths.
