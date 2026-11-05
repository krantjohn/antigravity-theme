const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', '..', 'core', 'theme_engine.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Replace normalizeSlotInput implementation
const oldNormalizeRegex = /function normalizeSlotInput\(input\) \{[\s\S]*?\n\}/;
const newNormalize = `function normalizeSlotInput(input) {
  if (input === null || input === undefined) return '';
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (trimmed !== input) return '';
  return input.toLowerCase();
}

function formatSlotDisplay(slotInput) {
  if (typeof slotInput === 'symbol') {
    return slotInput.description ? 'Symbol(' + slotInput.description + ')' : 'Symbol()';
  }
  return String(slotInput);
}`;

code = code.replace(oldNormalizeRegex, newNormalize);

// Update console.error(`${slotInput}`) calls to formatSlotDisplay(slotInput)
code = code.replace(
  /\$\{slotInput\}/g,
  '${formatSlotDisplay(slotInput)}'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully updated normalizeSlotInput and formatSlotDisplay!');
