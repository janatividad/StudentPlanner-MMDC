import fs from 'node:fs';
import child_process from 'node:child_process';

const gitFiles = child_process.execSync('git ls-files', { encoding: 'utf-8' }).trim().split('\n');

const findings = [];

for (const file of gitFiles) {
  if (file.endsWith('.png')) continue;
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check URLs
    const urls = line.match(/https?:\/\/[^\s"'<>`)]+/g);
    if (urls) {
      urls.forEach(u => {
        if (!u.includes('w3.org') && !u.includes('github.com/janatividad') && !u.includes('janatividad.github.io')) {
          findings.push({ file, line: idx + 1, type: 'URL', val: u });
        }
      });
    }
    // Check emails
    const emails = line.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g);
    if (emails) {
      emails.forEach(e => {
        findings.push({ file, line: idx + 1, type: 'EMAIL', val: e });
      });
    }
    // Check meeting or school keywords
    if (/zoom\.us|meet\.google|drive\.google|camu|teams\.microsoft/i.test(line)) {
      findings.push({ file, line: idx + 1, type: 'SCHOOL/MEETING/PORTAL', val: line.trim() });
    }
    // Check potential credentials
    if (/ghp_|gho_|github_pat_|eyJh|bearer\s+[a-zA-Z0-9_\-\.]+/i.test(line)) {
      findings.push({ file, line: idx + 1, type: 'CREDENTIAL', val: line.trim() });
    }
  });
}

// Check git log for any historical leaks
const gitLog = child_process.execSync('git log -p', { encoding: 'utf-8' });
const logLines = gitLog.split('\n');
logLines.forEach((line, idx) => {
  if (/ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]{20,}/i.test(line)) {
    findings.push({ file: 'GIT_HISTORY', line: idx + 1, type: 'CREDENTIAL_HISTORY', val: line.trim() });
  }
  if (/zoom\.us|meet\.google|drive\.google|teams\.microsoft/i.test(line)) {
    findings.push({ file: 'GIT_HISTORY', line: idx + 1, type: 'MEETING_HISTORY', val: line.trim() });
  }
});

console.log('Total findings:', findings.length);
console.log(JSON.stringify(findings, null, 2));
