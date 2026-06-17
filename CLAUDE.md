# Code Conventions

## TypeScript / React

- **No unused variables.** Remove state, imports, and local variables the moment they are no longer referenced. ESLint will error on `'x' is assigned a value but never used`.
- **Catch clauses.** Use `catch {}` (empty) when the error is intentionally swallowed. Use `catch (e: unknown)` only when you inspect `e`. Never use `catch (e: any)`.
- **State variables.** If a piece of state is removed from the JSX (e.g. a status message is no longer displayed), also remove its `useState` declaration and every `setState` call that writes to it.
- **Imports.** Only import what is used. MUI components are imported one-per-line from their individual paths (`@mui/material/Button`), not from the barrel.

## Formatting

- Prettier is configured (see `package.json`). **Always** run `npx prettier --write src/` after any edit session before considering work done. Prettier reformats long import blocks, multi-property interfaces, and JSX expressions — failing to run it causes lint/CI failures on the next push.

## Terminology (UI labels and help text)

- "source" (not "src") for the pre-synaptic neuron.
- "target" / "targets" (not "dst") for post-synaptic neurons.
- Singular: "source" (there is exactly one). Plural: "targets" (there can be many).
