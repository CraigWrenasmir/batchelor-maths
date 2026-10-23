# Batchelor maths sampler

Five maths investigations for teacher modelling, individual practice and paired work. Open the [sampler](https://craigwrenasmir.github.io/batchelor-maths/index.html), [teacher setup](https://craigwrenasmir.github.io/batchelor-maths/teacher.html) or [teacher guides](https://craigwrenasmir.github.io/batchelor-maths/docs/teacher-guides.html).

| Activity | Mathematical focus | Content and logic |
|---|---|---|
| How many? | Estimate a collection; count by ones, groups or rows; enter and check a total | `content/how-many.js`, `src/logic/howmany.js` |
| Where does it go? | Compare number size; use landmarks on a number line; reason from mystery-number clues | `content/number-line.js`, `src/logic/numberline.js` |
| Grow the pattern | Continue repeating patterns; build, compare and predict growing patterns | `content/patterns.js`, `src/logic/patterns.js` |
| Pack the gear | Make and partition a collection; adjust a total; repair and create a challenge | `src/fieldwork/pack-content.js`, `src/fieldwork/pack.js` |
| Find the way | Plan, test and revise directions; navigate a changed map; set a partner challenge | `src/fieldwork/route-content.js`, `src/fieldwork/route.js` |

## Status and classroom use

This is a **sampler for a small classroom trial**, not an assessment or a complete teaching programme. Challenge and support are separate choices; foundational content can be used with older learners without changing to a childish presentation. The guides suggest a 15–20-minute routine combining modelling, practice, explanation and an off-screen check. That is a suggested plan, not a measured engagement result.

The [curriculum map](docs/curriculum-map.md) gives provisional connections to selected Australian Curriculum v9 content. The three supplied school scope-and-sequence files contained 0 bytes, so they could not be read. Alignment with the school's own sequence remains to be checked.

The activities are designed for iPad browsers, interactive boards and laptops. Browser checks and their limits are recorded in [the testing log](docs/testing-log.md); a physical classroom iPad and Smartboard trial is still needed.

## What changed in the combined sampler

- **Counting:** direct total entry with retry feedback; whole-group and row counting; an option to arrange scattered collections into groups. One-by-one counting remains available.
- **Number line:** close placements remain editable and are distinguished from exact placements. Touch and keyboard adjustment controls support precise placement.
- **Patterns:** a correct total in a different arrangement leads to comparison. The learner's construction is kept; continuing uses the shown pattern's growth rule. Stairs feedback describes its changing increments.
- **Access:** a shared **Listen** control reads the current instruction; **Show me** gives a separate visual example; optional **Read feedback** uses the device voice. These support teacher demonstration rather than replacing it.
- **One collection:** all five activities share a home page, teacher setup, guide links and delivery controls.

## Run it locally

There is no build step and no runtime dependency. Serve the repository using an ordinary static file server:

```sh
cd Batchelor-Maths
python3 -m http.server 8077 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8077/`. Opening `index.html` directly from Finder is not supported: the activities use ES modules, which browsers commonly block on `file:` URLs.

Run the logic tests with Node's built-in runner:

```sh
npm test
```

Browser walkthrough scripts under `tools/` require Playwright. See each script and the testing log for the current checks; a passing logic test does not establish classroom usability or learning impact.

## Project layout

```text
index.html                home screen for all five activities
teacher.html              teacher choices and shareable setup links
activities/*.html         activity entry pages
src/config.js             school identity and acknowledgement wording
src/shared.css            shared visual system and delivery controls
src/shared.js             shell, instructions, examples, speech, feedback, keypad
src/ui/*.js               activity interfaces and the Pack/Find integration
src/logic/*.js            pure logic for the original three activities
src/fieldwork/            Pack the gear and Find the way content, logic and styles
content/*.js              presets and contexts for the original three activities
assets/                   original/placeholder visual assets
docs/                     teacher guides, curriculum map, testing log
tests/                    logic tests
tools/                    optional browser checks
```

## Teacher settings and links

The teacher page builds bookmarkable links. A link shares the setup and round code, not a learner's answers or current progress.

| Parameter | Values | Activities |
|---|---|---|
| `preset` | IDs in `content/*.js` | How many?, Where does it go?, Grow the pattern |
| `packRange` | `5`, `10`, `20` | Pack the gear |
| `routeLevel` | `short`, `turns`, `detour` | Find the way |
| `context` | Counting contexts in `content/contexts.js`; `equipment` or `shapes` for Pack/Find | How many?, Pack the gear, Find the way |
| `quick` | `off` or `on` (optional three-second look) | How many? |
| `game` | `place` or `mystery` | Where does it go? |
| `mode` | `ipad` or `class` | All |
| `support` | `full` or `light` for the original three; `guided`, `some` or `independent` for Pack/Find | All |
| `sound` | `off` or `on` for automatic feedback reading | All |
| `seed` | Round code; use the same activity and choices as well as the same code | All |

Pack cycles through three number sequences per range; Find cycles through four reflected maps per route setting. Their codes select from these small sets, not an unlimited question bank. The last stages let students choose a quantity or a flag location within the activity's constraints. New learner starts a fresh round/session; setup changes start fresh too.

## Hosting, privacy and offline use

The canonical public site is [GitHub Pages](https://craigwrenasmir.github.io/batchelor-maths/index.html), served from this repository. The application is static HTML, CSS and JavaScript. It has no application backend, student accounts, analytics, saved results or live AI calls. It makes no application requests to an AI service. The hosting provider may still maintain its normal server logs.

Only delivery and feedback-reading preferences are kept in browser storage where available. **New learner** clears the activity work. No performance history is recorded. Speech uses the browser/device voice; availability and voice quality vary, and the activity works with speech off.

For another HTTPS static host, copy `index.html`, `teacher.html`, `activities/`, `src/`, `content/`, `assets/` and `docs/`, preserving their relative paths and file types. A school-approved web server is appropriate; a document preview service may not execute the JavaScript. Offline caching is not implemented or guaranteed. Adding a shortcut to an iPad Home Screen does not make the site available offline.

## Identity, context and provenance

School name, logo and acknowledgement wording are configured in `src/config.js`. The school logo was supplied by Craig for this sampler and is displayed without altering the artwork. Local names, distances, artwork and acknowledgement wording should be checked with the school and relevant community contributors. The sampler does not imply cultural endorsement. No student details or school-supplied curriculum documents are included.

The combined collection builds on the original three-activity Claude sampler in this repository at commit [`ae5a818ac5db7a74ed8884d636d0ce44c142a310`](https://github.com/CraigWrenasmir/batchelor-maths/tree/ae5a818ac5db7a74ed8884d636d0ce44c142a310), and the separate Pack the gear / Find the way prototype developed for this project. Their content and logic have been integrated into one static site. SVG scenes, icons and activity artwork are original project assets; they are not documentary images of the school or community.

To add a counting context, update `content/contexts.js` and its matching SVG symbol in `src/ui/scenes.js`. Use original artwork or school-supplied material with permission. The mathematical content is fixed in the source and does not generate new text with AI during use.
