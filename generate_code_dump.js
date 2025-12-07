const fs = require('fs');
const path = require('path');

const files = [
    'server/index.js',
    'server/package.json',
    'client/src/App.jsx',
    'client/src/main.jsx',
    'client/src/index.css',
    'client/package.json',
    'client/capacitor.config.json',
    'client/vite.config.js',
    'client/postcss.config.js',
    'client/tailwind.config.js',
    'docs/POSTER_BATTLE_HISTORY.md',
    'docs/TMDB_CENSORSHIP_ANALYSIS.md'
];

let output = '# PWA-TorServe: Full Project Code\n\nGenerated on ' + new Date().toISOString() + '\n\n';

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const ext = path.extname(file).substring(1);
        const lang = ext === 'js' || ext === 'jsx' ? 'javascript' : ext === 'json' ? 'json' : 'markdown';

        output += `## File: ${file}\n\n\`\`\`${lang}\n${content}\n\`\`\`\n\n---\n\n`;
        console.log(`Added ${file}`);
    } catch (err) {
        console.error(`Skipped ${file}: ${err.message}`);
    }
});

fs.writeFileSync('FULL_PROJECT_CODE.md', output);
console.log('Done!');
