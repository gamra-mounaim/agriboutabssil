import fs from 'fs';
const filePath = './src/App.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the marker line
const markerIndex = lines.findIndex((l, i) => l.trim() === ") : (" && lines[i+1]?.includes('div className="space-y-4"'));

if (markerIndex !== -1) {
    console.log("Found marker at line " + (markerIndex + 1));
    // The bad block starts 2 lines above (the </div> and <>)
    const badStart = markerIndex - 2;
    
    // Find the end: the first )} that closes this block
    let badEnd = markerIndex;
    while (badEnd < lines.length && !lines[badEnd].includes(")}")) {
        badEnd++;
    }
    
    console.log("Deleting block from " + (badStart + 1) + " to " + (badEnd + 1));
    lines.splice(badStart, (badEnd - badStart) + 1);
    
    // Add correct closures for the map that was before it
    lines.splice(badStart, 0, "                     </div>", "                  )}");
    
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log("Successfully cleaned up.");
} else {
    console.log("Marker not found.");
}
