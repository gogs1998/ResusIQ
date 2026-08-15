# Inbox: impl-demo (file channel - read before starting and when blocked)

## 2026-08-15 - From team-lead - SCOPE ADDENDUM to Commit 2 - demo ships at resusiq.app/demo

Gordon's direction changed AFTER your brief: the demo is not a folder he uploads to iqlabs.app - it ships at resusiq.app/demo, served by THIS repo's GitHub Pages deploy under a custom domain (shotclockapp.com pattern). Amend Commit 2:

1. Demo-mode detection adds a PATH check: location.pathname starting with /demo activates demo mode, alongside the existing ?demo and VITE_DEMO checks. One module (src/lib/demoMode.ts), tested for all three triggers.
2. The normal `npm run build` must emit dist/demo/index.html - a copy of the built index.html (same bundle; demo-ness comes from the PATH at runtime) so GitHub Pages serves resusiq.app/demo without SPA-fallback hacks. Small vite plugin or postbuild script (scripts/emit-demo-entry.mjs) - your call, keep it dumb. IMPORTANT: asset URLs in the copied index.html must resolve from /demo/ - with base '/' the built asset paths are absolute (/assets/...), so a straight copy works; verify that is true in the output rather than assuming.
3. Add public/CNAME containing exactly: resusiq.app
4. Workflow: the .github/workflows deploy sets a PAGES_BASE - change the deploy to base '/' (custom domain serves at root). Check the workflow file and make the minimal edit; call out in your report that this changes the EXISTING live URL semantics (gogs1998.github.io/ResusIQ redirects to the custom domain once set).
5. build:demo / dist-demo from the original brief: KEEP (still useful standalone) but no longer the primary deliverable; the primary is the path-based /demo on the main build.
6. Everything else in the original brief stands (banner, dial guard reason=demo, seeded demo practice, no persistence in demo mode, tests, gates).

Report as originally instructed (SendMessage + outbox file).
