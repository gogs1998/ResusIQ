// Demo mode: the public showcase build at resusiq.app/demo.
// Active when the path starts with /demo, when ?demo is present, or when
// built with VITE_DEMO=1. Decided ONCE at boot; the app then behaves
// identically except: a persistent not-for-clinical-use banner, the 999
// dial guard is always on (a public visitor must never pocket-dial an
// ambulance), a demo practice is seeded so the 999 script reads complete,
// and nothing persists beyond the tab (sessionStorage, throwaway key).
export const isDemoMode: boolean = (() => {
  try {
    if (import.meta.env.VITE_DEMO === '1') return true;
    const loc = window.location;
    return loc.pathname.startsWith('/demo') || new URLSearchParams(loc.search).has('demo');
  } catch {
    return false;
  }
})();

import type { PracticeSetup } from '../types';

export const DEMO_PRACTICE: PracticeSetup = {
  id: 'demo',
  name: 'IQ Labs Demo Practice',
  address: '1 Example Street, Glasgow',
  postcode: 'G1 1AA',
  phone: '0141 000 0000',
  aed_present: true,
  aed_location: 'Reception, beside the first-aid point',
  oxygen_present: true,
  oxygen_location: 'Surgery 1 cupboard',
  drugs_kit_location: 'Surgery 1 cupboard',
  staff_roles: [],
  equipment: [],
};
