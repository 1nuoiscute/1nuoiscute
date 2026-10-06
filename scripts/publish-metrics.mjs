import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const renders = process.env.METRICS_RENDER_DIR || '/metrics_renders';
const files = ['metrics-light.svg', 'metrics-dark.svg'];
const contents = files.map(name => {
  let svg = readFileSync(`${renders}/${name}`, 'utf8');
  if (!svg.includes('<svg') || !svg.includes('Contributions calendar') || !svg.includes('Overall issues and pull requests status')) {
    throw new Error(`Incomplete Metrics output: ${name}`);
  }
  if (/class=["'][^"']*\bfield error\b/.test(svg)) {
    throw new Error(`Metrics output contains an error: ${name}`);
  }
  if (name === 'metrics-dark.svg') {
    const palette = {
      '#ebedf0': '#161b22',
      '#9be9a8': '#0e4429',
      '#40c463': '#006d32',
      '#30a14e': '#26a641',
      '#216e39': '#39d353',
    };
    svg = svg.replace(/fill="(#ebedf0|#9be9a8|#40c463|#30a14e|#216e39)"/g,
      (_, color) => `fill="${palette[color]}"`);
  }
  return svg;
});

const start = '<!-- profile-metrics:start -->';
const end = '<!-- profile-metrics:end -->';
const block = `${start}\n## 最近动态\n\n<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="assets/metrics-dark.svg">\n  <source media="(prefers-color-scheme: light)" srcset="assets/metrics-light.svg">\n  <img src="assets/metrics-light.svg" alt="近半年的贡献日历与公开 PR 和 Issue 状态" width="480">\n</picture>\n${end}\n\n`;
const readme = readFileSync('README.md', 'utf8');
const begin = readme.indexOf(start);
const finish = readme.indexOf(end);
if ((begin >= 0) !== (finish >= 0) || (begin >= 0 && finish < begin)) {
  throw new Error('Unpaired Metrics markers in README');
}
let updated;
if (begin >= 0) {
  updated = readme.slice(0, begin) + block + readme.slice(finish + end.length).replace(/^\s*\n/, '');
} else {
  const anchor = '## 更多关于我';
  if (!readme.includes(anchor)) throw new Error('README insertion point changed; refusing to append blindly');
  updated = readme.replace(anchor, block + anchor);
}

mkdirSync('assets', { recursive: true });
files.forEach((name, i) => writeFileSync(`assets/${name}`, contents[i]));
writeFileSync('README.md', updated);
console.log('Published two validated Metrics renders and their README section.');
