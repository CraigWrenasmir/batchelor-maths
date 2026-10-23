# Combined sampler validation — 23 October 2026

The tested version combines Pack the gear, Find the way, How many?, Where does it go? and Grow the pattern. Tests establish the behaviour described below, not learning effectiveness or suitability for every learner.

## Passed checks

- **39 Node logic tests:** content bounds, valid partitions, route reachability and deliberate repairs, totals/group operations, number-line precision, pattern counts and shapes, and changing increments for stairs.
- **Chromium 145:** five home links and teacher presets; counting direct-total retry/success, whole groups and undo, regrouping; exact versus near number-line placements, correction with large adjustment buttons, mystery clues and reset; pattern wrong total, matching and alternative shapes, revise/keep decisions, preserved builds, repeating patterns, later predictions and stairs wording.
- **Chromium 145 and WebKit 26.5:** all five Pack stages at ranges 5/10/20; all four Find stages at short/more-steps/changing-route levels, including blocked paths, intentional repair failure, required stops and partner destinations. Shared settings/seed, example preservation, mode preservation, new learner clearing, keyboard and touch events passed.
- **WebKit 26.5:** the same counting, number-line, teacher-link and shared-dialog core checks passed. Explicit focus restoration was added after closing dialogs to accommodate browser differences.
- **Responsive rendering:** representative screens at 390, 768, 1024, 1280 and 1920 pixels were inspected. No horizontal page overflow in the tested views. Pattern grids retain approximately 48 px targets in individual mode and 56 px in classroom mode; on narrow screens the grid scrolls inside its labelled region. Some taller tasks require vertical scrolling, especially on smaller boards/tablets.
- **Access/fallbacks:** visible instructions and activities continue when speech or storage is unavailable. Tested enlarged root text at 200%, keyboard activation, modal Escape/focus, reduced-motion route behaviour, shared-device reset and legacy Pack/Find query-link routing.
- **Speech wiring:** Listen reads current instructions; questions and worked examples have repeatable listening actions. Example listening works independently of Read feedback. Tests instrumented speech requests and unavailable-voice handling; they did not assess audible voice quality.
- **Runtime requests:** the core browser check observed only requests to the same local origin. No third-party libraries, fonts, analytics, accounts or live AI are required by the static activities.
- **Game client:** the development skill's browser client opened the worked examples in all five activities and captured their visible states without application errors.

Browser evidence and screenshots were retained in the development workspace. `npm test` runs the repeatable pure logic tests. `tools/walkthrough.mjs` provides the core browser regression checks when Playwright and its browsers are installed; it defaults to a local server at port 8077. Set `BASE_URL`, `QA_OUTPUT` or `PLAYWRIGHT_EXECUTABLE_PATH` when needed. Run with `node tools/walkthrough.mjs` for Chromium or `node tools/walkthrough.mjs webkit` for WebKit.

## Tablet usability follow-up

- Rechecked all five initial activity views in WebKit at 768 × 1024 and 1024 × 768. No horizontal overflow or application errors were observed.
- Find the way now uses a person (or plain counter), persistent Start/Finish labels and matching map/legend icons. Touch-based completion and reset passed in six layouts/context combinations, including 1024 × 680 and 1024 × 600 usable viewports. Direction controls and map squares stayed at least 48 px in the tested views. All eight route logic tests passed.
- How many keeps its picture and answer keypad alongside one another on portrait tablets. Grow the pattern uses a compact row of examples in landscape tablet widths, keeping Check beside the build grid. Large pattern grids retain 48 px cells and can still need vertical scrolling.
- This is browser and touch-event emulation, not testing on a physical iPad.

## Readability follow-up

- Student screens use larger system text, short action labels and a consistent Listen / Show me / Hint row. Teacher controls are grouped in the Teacher dialog; discussion questions expand on request.
- All 39 logic tests pass. The maintained WebKit walkthrough passes counting/retry/grouping, exact number placement, mystery clues, shared-device reset, current instruction speech and settings focus restoration.
- Fifteen WebKit activity/layout combinations (five activities at 768 × 1024, 1024 × 680 and 390 × 844) passed checks for help access, hidden adult controls, mode changes, feedback speech preference, new-learner reset and no horizontal overflow.
- Twenty core-activity touch states passed in WebKit at both iPad orientations. Pack/Route touch flows passed in Chromium and WebKit, including checked answers, changed routes and examples. Pack check results now reach the optional feedback voice. Standard game-client screenshots for all five activities were inspected.
- Unavailable speech/storage, enlarged text, help controls and dialog keyboard focus were checked.
- Repeating-pattern and mystery-number examples now match their selected task modes. Darker pattern-grid outlines help distinguish adjacent squares.

## Classroom checks still needed

- A physical school iPad and Smartboard: touch accuracy, orientation, display size, volume, voice availability and fullscreen behaviour.
- School filtering, Wi-Fi reliability and preferred hosting arrangements. No service worker/offline guarantee is provided.
- Learner engagement, comprehension, transfer to physical materials and usefulness of the proposed session duration.
- Human screen-reader/assistive-technology testing; this is not a full accessibility certification.
- Readable school scope-and-sequence documents, local context details and school/community approval of identity wording before claiming local curriculum alignment or endorsement.
