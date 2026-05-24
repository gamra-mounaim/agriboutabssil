const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = 'a.actor_name.toLowerCase().includes(searchHistory.toLowerCase())';
const replacement1 = '(a.actorName || \'\').toLowerCase().includes(searchHistory.toLowerCase())';

const target2 = '{a.actor_name}';
const replacement2 = '{a.actorName || \'System\'}';

let count = 0;
if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log("Successfully replaced target1!");
  count++;
}

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log("Successfully replaced target2!");
  count++;
}

if (count === 2) {
  fs.writeFileSync(path, content, 'utf8');
  console.log("All remaining actor_name fixes applied successfully!");
} else {
  console.error("Some replacements failed!");
}
