// Small, fixed examples never use or reveal the learner's current answer.
const step = (number, title, picture, text) => `<section class="demo-step"><h3>${number}. ${title}</h3><div class="demo-picture" aria-hidden="true">${picture}</div><p>${text}</p></section>`;
const grid = (...steps) => `<div class="demo-grid">${steps.join('')}</div>`;
export function demoFor(activity) {
  const options = new URLSearchParams(location.search);
  if (activity === 'how-many') return grid(
    step(1, 'Look', '● ● ●<br>● ● ●', 'About how many? Make a guess.'),
    step(2, 'Count', '<span>● ● ●</span> + <span>● ● ●</span>', 'Two groups of 3. Count 3, then 6.'),
    step(3, 'Check', '3 + 3 = 6', 'There are 6. Tap Enter total. Tap 6. Tap Check.'),
  );
  if (activity === 'where-does-it-go') {
    if (options.get('game') === 'mystery') return grid(
      step(1, 'Guess', '0 ━━ 5 ━━ 10', 'Tap halfway. Guess 5.'),
      step(2, 'Use the clue', '5 → 6 → 7 → 8 → 9', 'If it says bigger, try a number to the right.'),
      step(3, 'Try again', '0 ━━━ ? ━ 10', 'Use each clue to find the number.'),
    );
    return grid(
      step(1, 'Look', '0 ━━━━━ 10', 'This line goes from 0 to 10.'),
      step(2, 'Place', '0 ━━ <strong>5</strong> ━━ 10', 'Tap the 5 card. Tap halfway along the line.'),
      step(3, 'Check', '← &nbsp; 5 &nbsp; →', 'Tap Check. Tap Left or Right to move a card.'),
    );
  }
  if ((options.get('preset') || '').startsWith('repeat')) return grid(
    step(1, 'Look', '<span style="color:#2f5f3f">●</span> <span style="color:#b65a2e">▲</span> <span style="color:#2f5f3f">●</span> <span style="color:#b65a2e">▲</span>', 'Circle, triangle. Circle, triangle.'),
    step(2, 'Find the next shape', '● ▲ &nbsp; ● ▲ &nbsp; ?', 'The next shape is a circle.'),
    step(3, 'Fill the boxes', '● ▲ &nbsp; ● ▲ &nbsp; ● ▲ ●', 'Tap a shape for each box. Tap Check.'),
  );
  return grid(
    step(1, 'Look', '● &nbsp; ●● &nbsp; ●●●', '1 tile. 2 tiles. 3 tiles. Add 1 each time.'),
    step(2, 'Build', '●●●●', 'The next step has 4 tiles. Tap squares to build it.'),
    step(3, 'Think ahead', '1 → 2 → 3 → 4 → ?', 'How many at step 5? What about step 10?'),
  );
}
