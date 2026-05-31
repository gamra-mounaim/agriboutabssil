const fs = require('fs');

// SettingsManagement.tsx
let sm = fs.readFileSync('src/pages/SettingsManagement.tsx', 'utf-8');
const smRegex = /export default function SettingsManagement\(\{[\s\S]*?\}\) \{/;
const smNewSig = `export default function SettingsManagement({ 
  isDriveConnected,
  backingUpToDrive,
  handleGoogleConnect,
  handleDriveBackup,
  setBackingUpToDrive
}: { 
  isDriveConnected: boolean,
  backingUpToDrive: boolean,
  handleGoogleConnect: () => Promise<void>,
  handleDriveBackup: () => Promise<void>,
  setBackingUpToDrive: (b: boolean) => void
}) {
  const { appUsers: users, settings, setMessage, fetchData: onRefresh, latestBackup } = useStore();
  const { language, user: currentUser } = useAuthStore();
`;
if (!sm.includes('useStore')) {
  sm = sm.replace("import { Language, translations } from '../translations';", "import { Language, translations } from '../translations';\nimport { useStore, useAuthStore } from '../store/useStore';");
}
sm = sm.replace(smRegex, smNewSig);
fs.writeFileSync('src/pages/SettingsManagement.tsx', sm);

// StaffManagement.tsx
let stm = fs.readFileSync('src/pages/StaffManagement.tsx', 'utf-8');
const stmRegex = /export default function StaffManagement\(\{[\s\S]*?\}\) \{/;
const stmNewSig = `export default function StaffManagement({ 
  isDriveConnected,
  backingUpToDrive,
  handleGoogleConnect,
  handleDriveBackup,
  setBackingUpToDrive
}: { 
  isDriveConnected: boolean,
  backingUpToDrive: boolean,
  handleGoogleConnect: () => Promise<void>,
  handleDriveBackup: () => Promise<void>,
  setBackingUpToDrive: (b: boolean) => void
}) {
  const { appUsers: users, settings, setMessage, fetchData: onRefresh, latestBackup } = useStore();
  const { language, user: currentUser } = useAuthStore();
`;
if (!stm.includes('useStore')) {
  stm = stm.replace("import { Language, translations } from '../translations';", "import { Language, translations } from '../translations';\nimport { useStore, useAuthStore } from '../store/useStore';");
}
stm = stm.replace(stmRegex, stmNewSig);
fs.writeFileSync('src/pages/StaffManagement.tsx', stm);

console.log("Settings and Staff refactored!");
