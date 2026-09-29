/**
 * Pulls in the ambient declarations for the GJS runtime itself: the `print`,
 * `printerr` and `console` globals, the `system` and `gettext` built-in modules,
 * and the DOM subset GJS reimplements (`TextDecoder`, timers, `import.meta.url`).
 *
 * The full `lib.dom.d.ts` is deliberately not enabled instead, because it would
 * also declare browser APIs that do not exist in GJS.
 */

/// <reference types="@girs/gjs" />
/// <reference types="@girs/gjs/dom" />
