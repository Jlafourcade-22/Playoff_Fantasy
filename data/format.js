const fs = require('fs');

// Read and parse original file
const data = fs.readFileSync('data.json', 'utf8');
const parsed = JSON.parse(data);

// Use standard JSON formatting with 2-space indent
let formatted = JSON.stringify(parsed, null, 2);

// Make number arrays single line with spaces after commas
formatted = formatted.replace(/\[\s+(null|[\d.]+)(,\s+(null|[\d.]+))*\s+\]/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/, /g, ', ');
});

// Make player objects single line with spaces after commas
formatted = formatted.replace(/\{\s+"slot":[^}]+\}/g, (match) => {
  return match.replace(/\s+/g, ' ').replace(/,\s+/g, ', ').replace(/:\s+/g, ': ');
});

// Write back
fs.writeFileSync('data.json', formatted, 'utf8');

console.log('Formatting complete!');
