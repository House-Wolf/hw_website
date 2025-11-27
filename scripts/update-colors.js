const fs = require('fs');
const path = require('path');

// Color mapping from old to new
const colorMappings = [
  // Old wolf colors to new semantic colors
  { old: /var\(--wolf-pearl\)/g, new: 'var(--text-primary)' },
  { old: /var\(--wolf-smoke\)/g, new: 'var(--text-secondary)' },
  { old: /var\(--wolf-silver\)/g, new: 'var(--text-primary)' },
  { old: /var\(--wolf-crimson\)/g, new: 'var(--accent-primary)' },
  { old: /var\(--wolf-ember\)/g, new: 'var(--accent-primary)' },
  { old: /var\(--wolf-rust\)/g, new: 'var(--accent-primary-hover)' },
  { old: /var\(--wolf-steel\)/g, new: 'var(--border-default)' },
  { old: /var\(--wolf-ash\)/g, new: 'var(--background-elevated)' },
  { old: /var\(--wolf-charcoal\)/g, new: 'var(--background-card)' },
  { old: /var\(--wolf-obsidian\)/g, new: 'var(--background-base)' },

  // Old graphite/accent colors to new semantic colors
  { old: /var\(--graphite-50\)/g, new: 'var(--text-primary)' },
  { old: /var\(--graphite-\d+\)/g, new: 'var(--text-secondary)' },
  { old: /var\(--foreground\)/g, new: 'var(--text-primary)' },
  { old: /var\(--foreground-muted\)/g, new: 'var(--text-secondary)' },
  { old: /var\(--accent-soft\)/g, new: 'var(--accent-secondary)' },
  { old: /var\(--accent-main\)/g, new: 'var(--accent-primary)' },
  { old: /var\(--accent-strong\)/g, new: 'var(--accent-primary)' },
  { old: /var\(--background\)/g, new: 'var(--background-base)' },
  { old: /var\(--background-secondary\)/g, new: 'var(--background-elevated)' },
  { old: /var\(--background-elevated\)/g, new: 'var(--background-elevated)' },
  { old: /var\(--border\)/g, new: 'var(--border-default)' },
  { old: /var\(--border-soft\)/g, new: 'var(--border-subtle)' },
  { old: /var\(--border-strong\)/g, new: 'var(--border-strong)' },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  colorMappings.forEach(mapping => {
    if (mapping.old.test(content)) {
      content = content.replace(mapping.old, mapping.new);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
    return true;
  }

  return false;
}

function walkDirectory(dir, filePattern = /\.tsx?$/) {
  const files = fs.readdirSync(dir);
  let updateCount = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      updateCount += walkDirectory(filePath, filePattern);
    } else if (stat.isFile() && filePattern.test(file)) {
      if (updateFile(filePath)) {
        updateCount++;
      }
    }
  });

  return updateCount;
}

// Run the update
const appDir = path.join(__dirname, '..', 'app');
const componentsDir = path.join(__dirname, '..', 'components');

console.log('Updating color variables in app directory...');
const appUpdates = walkDirectory(appDir);

console.log('Updating color variables in components directory...');
const componentUpdates = walkDirectory(componentsDir);

console.log(`\nTotal files updated: ${appUpdates + componentUpdates}`);
