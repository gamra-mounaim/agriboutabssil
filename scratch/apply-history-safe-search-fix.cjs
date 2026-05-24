const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Target 1: filteredPayments
const target1 = `  const filteredPayments = payments.filter(p => {
    const d = new Date(p.date);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const matchesSearch = p.customerName.toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_number || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_owner || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesSearch;
  });`;

const replacement1 = `  const filteredPayments = payments.filter(p => {
    const d = new Date(p.date);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const matchesSearch = (p.customerName || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_number || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
                         (p.check_owner || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesSearch;
  });`;

// Target 2: filteredActivities
const target2 = `  const filteredActivities = (activities || []).filter(a => {
    const d = new Date(a.timestamp);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const matchesType = filterActivityType === 'all' || a.type === filterActivityType;
    const matchesSearch = a.details.toLowerCase().includes(searchHistory.toLowerCase()) || 
                         (a.actorName || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesType && matchesSearch;
  });`;

const replacement2 = `  const filteredActivities = (activities || []).filter(a => {
    const d = new Date(a.timestamp);
    const matchesMonth = filterMonth === 0 || d.getMonth() + 1 === filterMonth;
    const matchesYear = d.getFullYear() === filterYear;
    const matchesType = filterActivityType === 'all' || a.type === filterActivityType;
    const matchesSearch = (a.details || '').toLowerCase().includes(searchHistory.toLowerCase()) || 
                         (a.actorName || '').toLowerCase().includes(searchHistory.toLowerCase());
    return matchesMonth && matchesYear && matchesType && matchesSearch;
  });`;

function norm(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

let contentNorm = content.replace(/\r\n/g, '\n');
let replaced1 = false;
let replaced2 = false;

if (contentNorm.includes(norm(target1))) {
  contentNorm = contentNorm.replace(norm(target1), replacement1.replace(/\r\n/g, '\n'));
  replaced1 = true;
}

if (contentNorm.includes(norm(target2))) {
  contentNorm = contentNorm.replace(norm(target2), replacement2.replace(/\r\n/g, '\n'));
  replaced2 = true;
}

if (replaced1 && replaced2) {
  fs.writeFileSync(path, contentNorm.replace(/\n/g, '\r\n'), 'utf8');
  console.log("Successfully fixed both undefined searchHistory crashes in App.tsx!");
} else {
  console.error("Failed to find targets. Replaced1:", replaced1, "Replaced2:", replaced2);
}
