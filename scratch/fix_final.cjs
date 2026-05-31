const fs = require('fs');

// 1. Fix App.tsx missing useStore
let app = fs.readFileSync('src/App.tsx', 'utf-8');
if (!app.includes('import { useStore }')) {
  app = app.replace("import { View } from './types';", "import { View } from './types';\nimport { useStore } from './store/useStore';");
}
// Remove `n literal if it exists
app = app.replace(/`n/g, '\n');
fs.writeFileSync('src/App.tsx', app);

// 2. Fix SettingsManagement latestBackup
let sm = fs.readFileSync('src/pages/SettingsManagement.tsx', 'utf-8');
sm = sm.replace('setBackingUpToDrive: (b: boolean) => void\n})', 'latestBackup: any,\n  setBackingUpToDrive: (b: boolean) => void\n})');
// Fix <StaffManagement /> props inside SettingsManagement
sm = sm.replace('<StaffManagement \n          users={users} \n          setMessage={setMessage} \n          currentUser={currentUser} \n          language={language} \n          onRefresh={onRefresh}\n          isDriveConnected={isDriveConnected}\n          backingUpToDrive={backingUpToDrive}\n          handleGoogleConnect={handleGoogleConnect}\n          handleDriveBackup={handleDriveBackup}\n          latestBackup={latestBackup}\n          setBackingUpToDrive={setBackingUpToDrive}\n        />', '<StaffManagement \n          isDriveConnected={isDriveConnected}\n          backingUpToDrive={backingUpToDrive}\n          handleGoogleConnect={handleGoogleConnect}\n          handleDriveBackup={handleDriveBackup}\n          latestBackup={latestBackup}\n          setBackingUpToDrive={setBackingUpToDrive}\n        />');
fs.writeFileSync('src/pages/SettingsManagement.tsx', sm);

// 3. Fix StaffManagement latestBackup
let stm = fs.readFileSync('src/pages/StaffManagement.tsx', 'utf-8');
stm = stm.replace('setBackingUpToDrive: (b: boolean) => void\n})', 'latestBackup: any,\n  setBackingUpToDrive: (b: boolean) => void\n})');
fs.writeFileSync('src/pages/StaffManagement.tsx', stm);

// 4. Fix CustomerList translations paymentMethod
let cl = fs.readFileSync('src/pages/CustomerList.tsx', 'utf-8');
cl = cl.replace(/t\.payment_method/g, 't.paymentMethod');
cl = cl.replace(/t\.check_number/g, 't.checkNumber');
cl = cl.replace(/t\.check_owner/g, 't.checkOwner');
cl = cl.replace(/t\.check_due_date/g, 't.checkDueDate');
fs.writeFileSync('src/pages/CustomerList.tsx', cl);

console.log("All fixes applied!");
