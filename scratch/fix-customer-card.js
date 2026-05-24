const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldBlock = `                    {c.debt > 0 && c.due_date && (
                      <div className="mt-3 pt-3 border-t border-red-200/50 flex items-center gap-1.5 relative z-10">
                        <CalendarClock className={cn("w-3.5 h-3.5", new Date(c.due_date) < new Date() ? "text-danger animate-pulse" : "text-amber-600")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-wider", new Date(c.due_date) < new Date() ? "text-danger animate-bounce" : "text-amber-700")}>
                          {language === 'ar' ? 'تاريخ الاستحقاق' : 'ECHEANCE'}: {new Date(c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}
                        </span>
                      </div>
                    )}`;

const newBlock = `                    {c.debt > 0 && (c.dueDate || c.due_date) && (
                      <div className="mt-3 pt-3 border-t border-red-200/50 flex items-center gap-1.5 relative z-10">
                        <CalendarClock className={cn("w-3.5 h-3.5", new Date(c.dueDate || c.due_date) < new Date() ? "text-danger animate-pulse" : "text-amber-600")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-wider", new Date(c.dueDate || c.due_date) < new Date() ? "text-danger animate-bounce" : "text-amber-700")}>
                          {language === 'ar' ? 'تاريخ الاستحقاق' : 'ECHEANCE'}: {new Date(c.dueDate || c.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'fr-FR')}
                        </span>
                      </div>
                    )}`;

// Handle both CRLF and LF
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOldBlock = oldBlock.replace(/\r\n/g, '\n');
const normalizedNewBlock = newBlock.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedOldBlock)) {
  const updatedContent = normalizedContent.replace(normalizedOldBlock, normalizedNewBlock);
  // Keep original line endings if they were CRLF
  const finalContent = content.includes('\r\n') ? updatedContent.replace(/\n/g, '\r\n') : updatedContent;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log("SUCCESS: Customer card due date display updated successfully!");
} else {
  console.error("ERROR: Could not find the old customer card due date display block in App.tsx.");
}
