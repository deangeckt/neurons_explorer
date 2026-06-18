const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
const buildDir = path.join(__dirname, '..', 'build');
const remote = 'https://github.com/deangeckt/neurons_explorer.git';

run('git init', buildDir);
run('git checkout -b gh-pages', buildDir);
run('git add -A', buildDir);
run('git commit -m "deploy"', buildDir);
run(`git remote add origin ${remote}`, buildDir);
run('git push --force origin gh-pages', buildDir);

fs.rmSync(path.join(buildDir, '.git'), { recursive: true, force: true });
