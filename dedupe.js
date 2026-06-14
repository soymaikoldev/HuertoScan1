const fs = require('fs');
const file = './crops_data.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const map = new Map();
for (const crop of data) {
    if (!map.has(crop.id)) {
        map.set(crop.id, crop);
    }
}
const deduplicated = Array.from(map.values());
fs.writeFileSync(file, JSON.stringify(deduplicated, null, 2));
console.log('Deduplicated crops_data.json');
