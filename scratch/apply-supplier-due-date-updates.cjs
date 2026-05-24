const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace 1: add supplierDueDate state
const target1 = `  const [address, setAddress] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');`;
const replacement1 = `  const [address, setAddress] = useState('');
  const [supplierDueDate, setSupplierDueDate] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');`;

// Replace 2: update editForm keys
const target2 = `  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });`;
const replacement2 = `  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', due_date: '' });`;

// Replace 3: update addSupplier submission
const target3 = `      await api.addSupplier({ 
        name: name.trim(), 
        email: email.trim(), 
        phone: phone.trim(), 
        address: address.trim(),
        debt: parseFloat(initialDebt) || 0
      });
      setName('');
      setInitialDebt('0');
      setEmail('');
      setPhone('');
      setAddress('');`;
const replacement3 = `      await api.addSupplier({ 
        name: name.trim(), 
        email: email.trim(), 
        phone: phone.trim(), 
        address: address.trim(),
        debt: parseFloat(initialDebt) || 0,
        due_date: supplierDueDate || null
      });
      setName('');
      setInitialDebt('0');
      setEmail('');
      setPhone('');
      setAddress('');
      setSupplierDueDate('');`;

// Replace 4: update openDetails editForm setting
const target4 = `    setEditForm({ 
      name: supplier.name, 
      email: supplier.email || '', 
      phone: supplier.phone || '', 
      address: supplier.address || '' 
    });`;
const replacement4 = `    setEditForm({ 
      name: supplier.name, 
      email: supplier.email || '', 
      phone: supplier.phone || '', 
      address: supplier.address || '',
      due_date: supplier.due_date || ''
    });`;

// Helper normalize newlines for exact matching
function norm(str) {
  return str.replace(/\r\n/g, '\n').trim();
}

function applyReplacement(description, target, replacement) {
  const normContent = content.replace(/\r\n/g, '\n');
  const normTarget = norm(target);
  const normReplacement = replacement.replace(/\r\n/g, '\n');

  if (normContent.includes(normTarget)) {
    // Replace in the normalized content, then write back with CRLF if original had CRLF
    const replaced = normContent.replace(normTarget, normReplacement);
    content = replaced.replace(/\n/g, '\r\n');
    console.log(`Successfully replaced: ${description}`);
    return true;
  } else {
    console.warn(`WARNING: Target not found for: ${description}`);
    return false;
  }
}

let success = true;
success = applyReplacement("Supplier Due Date State", target1, replacement1) && success;
success = applyReplacement("editForm keys update", target2, replacement2) && success;
success = applyReplacement("addSupplier fields", target3, replacement3) && success;
success = applyReplacement("openDetails editForm keys", target4, replacement4) && success;

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log("All basic supplier updates applied successfully!");
} else {
  console.error("Some replacements failed!");
}
