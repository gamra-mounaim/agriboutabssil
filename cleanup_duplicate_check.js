import fs from 'fs';
const filePath = './src/App.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
const badIndex = lines.findIndex((l, i) => l.includes("      </div>") && lines[i+1]?.includes("    <>") && lines[i+2]?.includes("  ) : ("));
if (badIndex !== -1) {
    console.log("Found bad sequence at line " + (badIndex + 1));
    let endIndex = badIndex;
    while (endIndex < lines.length && !lines[endIndex].includes("      )}")) {
        endIndex++;
    }
    console.log("Deleting from line " + (badIndex + 1) + " to " + (endIndex + 1));
    lines.splice(badIndex, (endIndex - badIndex) + 1);
    lines.splice(badIndex, 0, "                     </div>", "                  )}");
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log("Cleaned up duplicated Checks section.");
} else {
    console.log("Could not find the sequence.");
}
