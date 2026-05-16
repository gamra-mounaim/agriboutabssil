import fs from 'fs';
const filePath = './src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log("Starting regex-based fix...");

// Target strings from view_file (with some flexibility)
const target1 = /<\/button>\s*<\/div>\s*<\/div>\s*\)\)\}\s*<\/div>\s*<>\s*\) : \(/;
const replacement1 = `</button>
                             </div>
                          </div>
                        ))}
                     </div>
                  )}
               </div>
              </>;
            } else {
              return (`;

// For the second one, we'll look for that LE' marker specifically
const target2 = /\} catch \(e\) \{\s*console\.error\("Print error:", e\);\s*\}\s*\} else \{\s*LE' \? \(language === 'ar' \? 'فاتورة' : 'SALE'\) : item\.type\}\s*<\/div>/g;
const replacement2 = `</button>
                             </div>`;

if (target1.test(content)) {
    console.log("Matched target1");
    content = content.replace(target1, replacement1);
}

if (target2.test(content)) {
    console.log("Matched target2");
    content = content.replace(target2, replacement2);
}

fs.writeFileSync(filePath, content);
console.log("Script finished.");
