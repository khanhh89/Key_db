const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk(srcDir);
let totalReplacements = 0;
const modifiedFiles = [];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Hover text dark classes -> hover:text-white
  content = content.replace(/hover:text-\[#1F2937\]/gi, 'hover:text-white');
  content = content.replace(/hover:text-\[#1E293B\]/gi, 'hover:text-white');
  content = content.replace(/hover:text-\[#080c14\]/gi, 'hover:text-white');
  content = content.replace(/hover:text-\[#0f172a\]/gi, 'hover:text-white');
  content = content.replace(/hover:text-\[#000000\]/gi, 'hover:text-white');

  // 2. Button / Active state with text-[#0f172a]
  content = content.replace(/bg-\[#2563EB\]\s+text-\[#0f172a\]/g, 'bg-[#2563EB] text-white');
  content = content.replace(/text-\[#0f172a\]\s+bg-\[#2563EB\]/g, 'text-white bg-[#2563EB]');

  // 3. text-[#1F2937] & text-[#1f2937] -> text-white
  content = content.replace(/text-\[#1F2937\]/gi, 'text-white');

  // 4. text-[#1E293B] & text-[#1e293b] -> text-white
  content = content.replace(/text-\[#1E293B\]/gi, 'text-white');

  // 5. text-[#050b14] -> text-white
  content = content.replace(/text-\[#050b14\]/gi, 'text-white');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles.push(path.relative(srcDir, filePath));
    totalReplacements++;
  }
});

console.log(`Updated ${totalReplacements} files:`);
modifiedFiles.forEach(f => console.log(' - ' + f));
