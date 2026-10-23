# Batchelor maths investigations

Web-based maths investigations for Batchelor Area School (NT), built to run on iPads (Safari), interactive boards in an ordinary browser, and laptops. Three activities ship in this sampling release:

| Student-facing title | What it practises | Where the content lives |
|---|---|---|
| How many? | Estimation, counting by grouping, tens and ones, arrays | `content/how-many.js`, `content/contexts.js` |
| Where does it go? | Number magnitude on a number line, fractions, decimals, integers; mystery number (halving strategy) | `content/number-line.js` |
| Grow the pattern | Repeating patterns, growing patterns, predicting far steps, describing the rule | `content/patterns.js`, `src/logic/patterns.js` |

The curriculum mapping is in `docs/curriculum-map.md`. Teacher guides are a page on the site: `docs/teacher-guides.html`.

## Status

This is a **sampling release for review**. Content is mapped to the Australian Curriculum v9 Mathematics content descriptions, not yet to the school's own scope and sequence (the supplied files were empty; see the curriculum map). Nothing here has been tested on a physical iPad or the school's board yet; see `docs/testing-log.md`.

## Run it locally

No build step and no dependencies. Any static file server works:

```
cd Batchelor-Maths
python3 -m http.server 8077 --bind 127.0.0.1
# open http://127.0.0.1:8077/
```

Opening `index.html` straight from Finder will not work because the pages use ES modules, which browsers block on `file://`.

## Tests

Pure logic (question generation, ranges, feedback text, pattern counts) is tested with Node's built-in runner:

```
npm test
```

## Project layout

```
index.html                home screen
teacher.html              teacher set up: choose activity, preset, context, mode; copy a link
activities/*.html         one page per activity (thin shells)
src/config.js             school name, logo path, tagline, acknowledgement wording
src/shared.css            visual system (palette, type, controls, modes)
src/shared.js             shell: URL settings, big-screen mode, optional sound, feedback, keypad
src/ui/*.js               activity screens (DOM only)
src/logic/*.js            pure activity logic (no DOM, tested)
content/*.js              content packs and presets, with curriculum codes
assets/                   logo placeholder (replace with the school's logo)
docs/                     curriculum map, teacher guides, testing log
tests/                    node --test files
```

## Settings in the link

Every activity reads its settings from the URL, so a teacher can bookmark a set-up or put it on the board:

| Parameter | Values | Used by |
|---|---|---|
| `preset` | ids from `content/*.js` | all |
| `context` | `mounds`, `fish`, `stones`, `mangoes`, `birds`, `counters`, `blocks` | How many? |
| `quick` | `off` (default) or `on` for a 3-second look | How many? |
| `game` | `place` (default) or `mystery` | Where does it go? |
| `mode` | `ipad` (default) or `class` (big screen with teacher controls) | all |
| `support` | `full` (default) or `light` | all |
| `sound` | `off` (default) or `on` | all |
| `seed` | any whole number: same rounds on every device | all |

The teacher page builds these links for you.

## Replacing the identity

* School name, logo, tagline and the acknowledgement line: `src/config.js`. Put the school's logo file in `assets/` and point `logo` at it.
* Palette: the `:root` variables at the top of `src/shared.css`.
* Counting contexts: add an entry in `content/contexts.js` and a matching `<symbol>` in `src/ui/scenes.js`. Use original or school-supplied artwork only.
* Home-page tile art and the horizon strip: `index.html` and `horizonSvg()` in `src/ui/scenes.js`.

## Hosting

The site is static HTML, CSS and JavaScript with no backend, no accounts, no analytics and no third-party requests. It works from any HTTPS static host.

**GitHub Pages (current):** the `main` branch is served from the repository root. Pushing to `main` redeploys.

**School hosting:** copy the whole folder (everything except `tests/`, `package.json` and `.git`) to any web server or SharePoint-style static host that serves the files with their normal types. Relative paths are used throughout, so it can sit in a sub-folder.

**Adding to an iPad Home Screen:** open the home page in Safari, Share, Add to Home Screen. This gives a cleaner full-screen view. Offline use is not implemented.

## Privacy and policy notes

* No student data is stored. "New learner" clears the round. Only the big-screen and sound preferences are kept in the browser, if the browser allows it.
* No AI calls, no accounts, no cookies, no tracking.
* The school's curriculum documents are not included in the served build. The curriculum map cites them by file name and section only.

## Known limitations

See the end of `docs/curriculum-map.md` and `docs/testing-log.md`.
