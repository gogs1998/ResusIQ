# ResusIQ PWA rebuild — design

**Date:** 2026-09-20 · **Status:** validated with Gordon in conversation; implementation plan follows.
**Scope:** the web app (PWA). The native iOS shell (Capacitor: Siri/App Intents, on-device Foundation Model for Ask, enhanced TTS, SpeechAnalyzer) is a later layer that sits on top of this and is out of scope here.

## 1. Why this exists

The app has been reskinned three times (dark, light, Instrument console) and still reads as "too complicated, an MVP". The audits of 2026-08-30 explained why: every reskin restyled the same complexity — twelve tap targets on a drug step, seven taps from the cardiac tile to compressions, preamble before the act, and an entry model that asks a panicking person to *diagnose* before the app will help. Apple's principle of **deference** — the UI recedes so the task leads — is the one the app never met. This rebuild changes the shape, not the paint.

Guiding principles (Apple HIG): clarity, deference, hierarchy, consistency; ≥44pt targets; Dynamic Type; progressive disclosure; standard navigation (tab bar); one primary action per screen.

## 2. Information architecture — three tabs

A standard iOS tab bar with three flat sections. **The tab bar is hidden the moment an emergency starts** — the step screen owns the whole phone (existing hard rule: `ProtocolRunner` must always be reachable and never hidden).

| Tab | Purpose | Contents |
|---|---|---|
| **Emergency** | Something is happening now | Collapse door · obvious-presentation tiles · Call 999 · Settings gear |
| **Ask** | One fact, instantly | Search over the verified drug/protocol data → answer card. Data lookup only; nothing generated |
| **Learn** | Understand and practise | Protocol library (all information, unchanged) · Training drills |

Post-emergency screens (summary, SBAR handover, event log, reports) are reached from the **end-of-emergency summary**, not from a tab. Settings (mode, practice details) lives behind the gear on the Emergency tab.

## 3. The front door — assessment first, not diagnosis first

**Problem solved:** a collapsed patient could be cardiac arrest, a faint, a hypo, late anaphylaxis, adrenal crisis, a seizure or a stroke. They all look the same for the first ten seconds. The old ten-tile grid demanded a diagnosis nobody has. RCUK's universal algorithm doesn't diagnose first; it assesses response and breathing, and that decides the path.

### Emergency home

```
+------------------------------+
| ResusIQ                    * |
|                              |
| ############################ |
| #  THEY'VE COLLAPSED       # |  primary - the assessment path
| #  or are unresponsive     # |
| ############################ |
|                              |
| If it's obvious:             |
| +------------+ +-----------+ |
| | Choking    | | Chest pain| |
| +------------+ +-----------+ |
| | Allergic   | | Breathing | |
| | reaction   | | difficulty| |
| +------------+ +-----------+ |
| | Fitting    | | Stroke    | |
| +------------+ +-----------+ |
|                              |
| +-------- Call 999 --------+ |
+------------------------------+
|  Emergency  |  Ask  |  Learn |
+------------------------------+
```

Tiles that **disappear** from the home grid: cardiac arrest, faint, low blood sugar, adrenal crisis — the four you cannot tell apart by looking. They are reached only through the collapse door. (They remain in Learn.)

### The collapse path (two questions, then route)

1. **"Shake their shoulders and shout. Are they responding?"** → *Yes* / *No*
2. If No: **"Tilt the head back, lift the chin. Are they breathing normally?"** (≤10 s; occasional gasps are NOT normal) → *No* / *Yes*
   - **No** → `cardiac_arrest` landing on `start_cpr` (999 + defib fetch folded into that step, as today). **Two taps to CPR, and both are questions you genuinely must answer first.**
   - **Yes** → recovery position + 999, then a short cause check — *diabetic? · just had a fit? · something eaten/injected/stung? · on long-term steroids?* → routes to hypoglycaemia (unconscious branch) / seizure (post-ictal) / anaphylaxis / adrenal crisis; none → syncope's not-recovering path.
3. If Yes (responding): **"What's wrong?"** → the obvious tiles (chest pain, breathing, allergic, fit, stroke) or *just fainted* → syncope recovery.

Implementation note: this reuses the existing DR-ABC steps (`response`, `airway`, `breathing_check`, `breathing_decision`) and existing protocol landing steps via `startEmergency`/`switchProtocol`. The only new data is the cause-check decision and its routing. **Any change to protocol routing is a clinical change — the clinical reviewer ratifies the exact branch targets before it ships.** This also retires the entry-source `recognition:true` skip: the collapse door makes the "skip the preamble" mechanism unnecessary for the four collapse conditions, and the two obvious-tile protocols that were losing their opening action (chest pain "sit them up", asthma "sit them upright") get that action folded into their first shown step per the RCUK 2025 review.

## 4. Two modes — chosen beforehand, never mid-emergency

Same protocol graph, same doses, same voice, same event log. The mode changes only how much the step screen **reveals**. Set in Settings per device/person. No mode switch exists on any emergency screen (Apple: never make someone choose the interface while doing the task).

### Guide mode (default) — the talking defibrillator

```
+------------------------------+
| |ANAPHYLAXIS            3:42 |  thin bar: condition + elapsed clock
|                              |
|                              |
|   Give adrenaline into       |
|   the outer thigh now.       |  the ONE instruction - 40px, Dynamic Type
|                              |
|   500 micrograms             |  one quiet detail line (optional)
|                              |
|   (o) speaking...            |  tap to hear again
|                              |
| ############################ |
| #        GIVEN  /          # |  the ONE button - full width, 104px
| ############################ |
|   Call 999      Not breathing? CPR   |  two compact controls, always present
+------------------------------+
```

Exactly three controls: the primary action, Call 999, and the deterioration-to-CPR escape. The escape stays because it is a life-safety guarantee (architectural, every screen); it is compact, not a card. Nothing else: no progress bar (meaningless in a branching graph and it goes backwards in loops), no mic, no tab bar, no deck. Decisions render as two or three large choice buttons in place of the primary button. Drug steps show the dose in the detail line and the button reads *Given*.

### Clinician mode — the guided checklist

Guide mode plus: step counter, the drug card inline (dose bands, contraindications), dose-ceiling notices, and a single sheet (one handle, not three tabs) for the 999 script / doses given / log. Nothing is removed from Guide; things are added. Guide is therefore Clinician with things taken away — one component with a density switch, not two components.

## 5. Ask — a lookup, never a generator

A search field. "child adrenaline" → an answer card: age bands, route, site, the source citation. It is a search over `drugs.ts` and `protocols.ts` — **the answer is always the verified data, never generated text**, so it cannot hallucinate a dose, works offline, and is the same content the protocols use. On the later native shell an on-device model may *understand the question* and *phrase the answer*, but it must still only ever read the verified record — that rule is written here so the native layer inherits it.

## 6. Learn

The full protocol library (every protocol, every step, every drug — unchanged, including the four conditions removed from the home grid) and the training drills. Moved out of the emergency screen's way; nothing deleted.

## 7. End of emergency

Ending no longer strands the user on the home screen (audit P2). `endEmergency` → a one-screen **summary**: elapsed time, drugs given with times, 999 time; primary action **Hand over (SBAR)**; secondary: view log, save report, done. The tab bar returns after.

## 8. Voice — pre-recorded, fail-safe

All ~124 narration phrases are static and known at build time. They are pre-rendered once with a high-quality TTS, shipped as Opus files (~2 MB) in the precache, and **keyed by a SHA-256 of the exact phrase text**. If a phrase's text changes and its clip wasn't regenerated, the hash misses and the app falls back to browser `SpeechSynthesis` — so drift can never produce confident-but-wrong audio. Audio is **unlocked inside the first user gesture** (the tile/door tap primes `speechSynthesis` and a shared `AudioContext`) — this fixes the app being silent on iPhone. Browser TTS remains the fallback only. Clips are generated **after** the clinical text is frozen (RCUK 2025 fixes land first) so pronunciation sign-off happens once.

## 9. Visual language

Native-feeling, not branded-for-its-own-sake. System font stack (`-apple-system` → SF Pro on iOS; Inter elsewhere). Respect the system appearance (light/dark) on Emergency home, Ask, Learn. The emergency step screen is always high-contrast (dark theatre) — deliberate, for glare and focus. Colour keeps its four-meaning language (red = life threat/999, amber = safety gate, green = done, blue = information/voice). Radii and shadows as per the Instrument tokens. Every tappable ≥44pt; primary actions 104px. Dynamic Type honoured (pinch-zoom already restored).

## 10. What is folded in from the audits (must land with this)

- Audio unlock on first gesture (silent-iPhone fix) · `recognition:true` retirement per §3 · monitoring-loop exit + end affordance on chest pain / anaphylaxis / stroke · `activeEvent` persisted so a reload mid-emergency resumes · scroll-to-top on step change · safe-area-bottom on Triage result, AI assistant, Library detail · landscape scroll fallback · CPR minHeight clip · manifest colour drift.
- **RCUK 2025 clinical set** (prescribed 2026-09-11, all wording ready): infant choking branch; adult-only CPR scope statement now, child branch next release; oxygen in CPR; compression-only fallback; oxygen rework (reservoir-mask-first, <88%/cyanosis escalation, gate moved earlier, cyanosis in the question, SDCEP departure stated); hypo drowsy exit; glucagon weight-led + "inject entire contents" fix + repeat-interval removal; midazolam 3–6 m row dropped; second adrenaline opposite thigh; severe-asthma O2 device/target; syncope calls 999 before breathing check; all `references` to 2025 citations. Decisions taken: aspirin before GTN; kit GTN offered; adult-only CPR scope now.

## 11. Out of scope (explicitly)

Native shell and everything iOS-27-specific; conversational LLM voice; Ask by voice; child CPR branch (needs `CPRMode` to read `compressions_per_cycle` first); MHRA/DCB0129 assessment; human clinician sign-off (still zero — remains the headline caveat).

## 12. Success criteria

- Collapsed patient → CPR in **2 taps**, both clinically required questions.
- Guide-mode step screen has **3 controls**, never more.
- Every tile lands on an **act**, not a description.
- Voice speaks on a real installed iPhone; metronome ticks.
- All 250+ tests pass (file count verified, not the summary line) + new tests binding: flagged-step content, tile→first-action, action idempotence, end-reachability.
- No screen clips on iPhone 17 / SE / iPad / landscape.
