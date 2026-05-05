import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace dark:text-zinc-400, dark:text-zinc-500 with nothing
  content = content.replace(/\bdark:text-zinc-[45]00\b(?:\/[0-9]+)?/g, '');
  // Replace text-zinc-400, text-zinc-500 with text-muted
  content = content.replace(/\btext-zinc-[45]00\b(?:\/[0-9]+)?/g, 'text-muted');
  
  // Also text-gray-500 and text-gray-400 just in case
  content = content.replace(/\bdark:text-gray-[45]00\b(?:\/[0-9]+)?/g, '');
  content = content.replace(/\btext-gray-[45]00\b(?:\/[0-9]+)?/g, 'text-muted');
  
  // Replace dark:text-zinc-400/something that might be left
  content = content.replace(/\bdark:text-zinc-400\/[a-z0-9]+\b/g, '');
  content = content.replace(/\btext-zinc-[45]00\/[a-z0-9]+\b/g, 'text-muted');

  // cleanup extra spaces in classNames safely using a replacer
  content = content.replace(/className=(["'])(.*?)\1/g, (match, quote, classes) => {
    return `className=${quote}${classes.replace(/\s+/g, ' ').trim()}${quote}`;
  });
  content = content.replace(/className=\{cn\((.*?)\)\}/gs, (match, inner) => {
    return `className={cn(${inner.replace(/'\s+/g, "'").replace(/\s+'/g, "'").replace(/"\s+/g, '"').replace(/\s+"/g, '"')})}`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});
console.log(`Updated ${changedCount} files.`);