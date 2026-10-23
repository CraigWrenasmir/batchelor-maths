# Testing log

## Automated

* `npm test`: 19 logic tests (ranges, no overlap, arrays, groups and remainders, estimate grading, place-value text, number-line cards, fraction formatting, snapping, placement grading, benchmark text, mystery narrowing, pattern counts, repeating patterns). All passing, 23 Oct 2026.
* Playwright walkthrough (headless Google Chrome 1.58 channel) over every page: home, teacher set up, teacher guides, each activity in iPad landscape (1024 × 768, touch), iPad portrait (768 × 1024, touch) and board size (1920 × 1080, big-screen mode). Exercised: keypad estimate, tapping items, missed-item feedback, Count next, Hint and Reveal keyboard shortcuts, card placement by tap, Check with second attempt, mystery guesses and Hint, pattern build and Check, Reveal, repeating-pattern palette and Check. Zero console errors, zero failed requests.

## Checked by inspection of screenshots

* No year level, ability label, leaderboard or ranking appears on any student screen.
* Feedback uses an icon and words, not colour alone.
* Controls meet the 48 px minimum (68 px in big-screen mode).
* Portrait and landscape layouts both usable; portrait stacks the panel under the scene.

## Not yet tested (emulation only so far)

* A physical iPad in Safari (touch accuracy on the number line, Add to Home Screen, speech voice availability).
* The school's actual interactive board and its browser.
* Screen reader pass (VoiceOver) beyond the presence of labels, roles and the live region.
* Reduced-motion preference (CSS is in place, not observed on a device).
* Fullscreen on iPad Safari (the API is limited there; the button fails silently by design).
* Blocked or missing speech synthesis on a managed device (the code degrades to visible text; not observed on a device).
