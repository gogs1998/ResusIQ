// Theatre reaches past the app's own canvas.
//
// The emergency screens go dark, but the browser chrome around them did not:
// on an installed PWA the status bar stayed light, so the top of the phone
// still looked like the calm home screen while the app underneath had switched
// into an emergency. It reads as the app not really having changed mode — one
// of the seams behind "it looks like two products glued together".
//
// Two things move, both cheap and both reversible:
//   theme-color — the browser/OS tints its chrome with it. The document ships
//     with a media-split pair (dark/light); an override meta with no media
//     attribute wins over both while it exists, and is removed on the way out
//     so the original pair takes over again.
//   apple-mobile-web-app-status-bar-style — only read by an installed iOS PWA,
//     and only at certain moments, so treat it as best-effort decoration.
//
// Deliberately NOT a React effect: this is an external system being told about
// a state change, which is what effects are for, but the store is the thing
// that knows, and every caller of it already lives outside render.

const OVERRIDE_ID = 'riq-theme-color-emergency';
const EMERGENCY_CHROME = '#0C1118'; // matches .theatre --bg

/** Point the OS chrome at the theatre surface. Safe to call repeatedly. */
export function enterEmergencyChrome(): void {
  if (typeof document === 'undefined') return;
  let meta = document.getElementById(OVERRIDE_ID) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.id = OVERRIDE_ID;
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = EMERGENCY_CHROME;

  const ios = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (ios) ios.content = 'black-translucent';
}

/** Hand the chrome back to the document's own theme-color pair. */
export function exitEmergencyChrome(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(OVERRIDE_ID)?.remove();

  const ios = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  );
  if (ios) ios.content = 'black-translucent';
}
