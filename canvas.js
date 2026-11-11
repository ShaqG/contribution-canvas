'use strict';

const glyphs = {
  A:'0E11111F111111', B:'1E11111E11111E', C:'0E11101010110E', D:'1E11111111111E',
  E:'1F10101E10101F', F:'1F10101E101010', G:'0E11101711110F', H:'1111111F111111',
  I:'0E04040404040E', J:'0702020212120C', K:'11121418141211', L:'1010101010101F',
  M:'111B1515111111', N:'11191513111111', O:'0E11111111110E', P:'1E11111E101010',
  Q:'0E11111115120D', R:'1E11111E141211', S:'0F10100E01011E', T:'1F040404040404',
  U:'1111111111110E', V:'11111111110A04', W:'11111115151B11', X:'11110A040A1111',
  Y:'11110A04040404', Z:'1F01020408101F',
  0:'0E11131519110E', 1:'040C040404040E', 2:'0E11010204081F', 3:'1E01010E01011E',
  4:'02060A121F0202', 5:'1F101E0101011E', 6:'0E10101E11110E', 7:'1F010204080808',
  8:'0E11110E11110E', 9:'0E11110F01010E', ' ':'00000000000000',
};
const DAY = 86_400_000;
const MAX_YEAR = new Date().getFullYear();
const PRESETS = [0, 1, 3, 6, 12];
const messages = {
  en: {
    title: 'Contribution Canvas',
    intro: 'Draw on a year of GitHub contributions. Each square represents one day and its planned commit count.',
    year: 'Year', language: 'Language', paintedDays: 'Painted days', plannedCommits: 'Planned commits',
    calendarLabel: 'Yearly contribution graph, horizontally scrollable',
    gridLabel: 'Use the arrow keys to select a date and Space to paint.',
    weeks: 'One week per column, starting on Sunday', undo: 'Undo', clear: 'Clear',
    brush: 'Brush', swatchesLabel: 'Commits per square', customCount: 'Custom commit count', eraser: 'Eraser',
    pixelText: 'Pixel text', wordsLabel: 'Letters or numbers to draw', wordsPlaceholder: 'e.g. HELLO',
    draw: 'Draw', textHelp: 'Center letters or numbers on the canvas using the current brush.',
    patternFile: 'Pattern file', exportJson: 'Export JSON', import: 'Import',
    exportHelp: 'Use the exported file with the Python script to generate a local Git repository.',
    previewNote: 'The preview shows planned commits.', guide: 'Generation and push guide ↗',
    calendarTitle: '{year} canvas', selection: 'Click or drag across the squares to draw.',
    cell: '{date} · {count} commits',
    cellOne: '{date} · 1 commit',
    invalidPattern: 'Use a version 1 pattern JSON file with a valid year and a commits object.',
    invalidDate: 'Invalid entry {date}. Use a date in the selected year and a commit count from 1 to 100.',
    invalidBrush: 'Enter a whole number from 0 to 100 for the brush.',
    invalidText: 'Enter 1–8 English letters, digits, or spaces.',
    stamped: 'Drew {text}.', emptyCanvas: 'Paint at least one square before exporting.',
    exported: 'Exported {file}.', imported: 'Imported {file}.',
    invalidJson: 'The file does not contain valid JSON.',
    importFailed: 'Could not import the file. {detail}',
  },
  'zh-CN': {
    title: '贡献图画布',
    intro: '把一年画成一幅像素图。每格对应一天，颜色代表计划生成的提交数。',
    year: '年份', language: '语言', paintedDays: '着色天数', plannedCommits: '计划提交',
    calendarLabel: '年度贡献图，可横向滚动',
    gridLabel: '用方向键选择日期，按空格着色。',
    weeks: '每列一周，从周日开始', undo: '撤销', clear: '清空',
    brush: '画笔', swatchesLabel: '每格提交数', customCount: '自定义提交数', eraser: '橡皮擦',
    pixelText: '文字转像素', wordsLabel: '要绘制的英文或数字', wordsPlaceholder: '例如 HELLO',
    draw: '绘制', textHelp: '用当前画笔把英文或数字居中叠加到画布。',
    patternFile: '图案文件', exportJson: '导出 JSON', import: '导入',
    exportHelp: '将导出的文件交给 Python 脚本生成本地 Git 仓库。',
    previewNote: '预览显示计划新增的提交。', guide: '生成与推送说明 ↗',
    calendarTitle: '{year} 年画布', selection: '点击或拖动色块开始绘制。',
    cell: '{date} · {count} 次提交',
    cellOne: '{date} · 1 次提交',
    invalidPattern: '需要版本为 1 的贡献图 JSON，并包含有效年份和日期记录。',
    invalidDate: '无效记录 {date}。日期须属于所选年份，提交数须为 1–100 的整数。',
    invalidBrush: '画笔提交数请输入 0–100 的整数。',
    invalidText: '请输入 1–8 个英文字母、数字或空格。',
    stamped: '已绘制 {text}。', emptyCanvas: '先画至少一格，再导出图案。',
    exported: '已导出 {file}。', imported: '已导入 {file}。',
    invalidJson: '文件不是有效的 JSON。',
    importFailed: '导入失败。{detail}',
  },
};
const $ = id => document.getElementById(id);
const grid = $('grid');
const drafts = new Map();
let year = MAX_YEAR;
let pattern = new Map();
let calendar = [];
let cells = [];
let undo = [];
let focused = 0;
let stroke = null;
let language = defaultLanguage();

function defaultLanguage() {
  try {
    const stored = localStorage.getItem('contribution-canvas:language');
    if (stored === 'en' || stored === 'zh-CN') return stored;
  } catch {
    // Use the browser language when storage is unavailable.
  }
  return /^zh(?:-|$)/i.test(navigator.language) ? 'zh-CN' : 'en';
}

function translate(key, values = {}) {
  return messages[language][key].replace(/\{(\w+)\}/g, (_, name) => values[name]);
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.title = translate('title');
  $('language').value = language;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = translate(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll('[data-i18n-label]')) {
    element.setAttribute('aria-label', translate(element.dataset.i18nLabel));
  }
  $('words').placeholder = translate('wordsPlaceholder');
  $('guide').href = language === 'zh-CN' ? 'README.zh-CN.md' : 'README.md';
  $('swatches').firstElementChild.textContent = translate('eraser');
  const weekdays = language === 'zh-CN' ? ['日', '一', '二', '三', '四', '五', '六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  $('weekdays').replaceChildren(...weekdays.map(day => {
    const label = document.createElement('span');
    label.textContent = day;
    return label;
  }));
  $('status').textContent = '';
  render();
}

function datesForYear(value) {
  const start = new Date(Date.UTC(value, 0, 1));
  const end = Date.UTC(value + 1, 0, 1);
  const firstSunday = start.getTime() - start.getUTCDay() * DAY;
  const weeks = Math.ceil((end - firstSunday) / (7 * DAY));
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const ms = firstSunday + index * DAY;
    return ms >= start && ms < end ? new Date(ms).toISOString().slice(0, 10) : null;
  });
}

function textPixels(value, dates) {
  const width = value.length * 6 - 1;
  const offset = Math.floor((dates.length / 7 - width) / 2);
  const pixels = [];
  for (const [letterIndex, letter] of Array.from(value).entries()) {
    const rows = glyphs[letter].match(/../g).map(hex => parseInt(hex, 16));
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        const date = dates[(offset + letterIndex * 6 + col) * 7 + row];
        if (date && (rows[row] & (1 << (4 - col)))) pixels.push(date);
      }
    }
  }
  return pixels;
}

function validate(data) {
  if (data?.version !== 1 || !Number.isInteger(data.year) || data.year < 2008 || data.year > MAX_YEAR
      || !data.commits || typeof data.commits !== 'object' || Array.isArray(data.commits)) {
    throw new Error(translate('invalidPattern'));
  }
  const validDates = new Set(datesForYear(data.year));
  for (const [date, count] of Object.entries(data.commits)) {
    if (!validDates.has(date) || !Number.isInteger(count) || count < 1 || count > 100) {
      throw new Error(translate('invalidDate', { date }));
    }
  }
  return new Map(Object.entries(data.commits));
}

function snapshot() {
  return { version: 1, year, commits: Object.fromEntries([...pattern].sort(([a], [b]) => a.localeCompare(b))) };
}

function save() {
  drafts.set(year, new Map(pattern));
  try {
    localStorage.setItem('contribution-canvas:' + year, JSON.stringify(snapshot()));
  } catch {
    // Export remains available when file URLs or privacy settings block storage.
  }
}

function readDraft(value) {
  if (drafts.has(value)) return new Map(drafts.get(value));
  try {
    const raw = localStorage.getItem('contribution-canvas:' + value);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.year === value) return validate(data);
    }
  } catch {
    // Ignore malformed or inaccessible browser drafts.
  }
  return null;
}

function level(count) {
  if (count >= 12) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return count > 0 ? 1 : 0;
}

function updateCell(index) {
  const date = calendar[index];
  const cell = cells[index];
  if (!date) return;
  const count = pattern.get(date) ?? 0;
  if (count) cell.dataset.level = level(count);
  else delete cell.dataset.level;
  cell.title = translate(count === 1 ? 'cellOne' : 'cell', { date, count });
  cell.setAttribute('aria-label', cell.title);
}

function updateTotals() {
  $('days').textContent = pattern.size;
  $('commits').textContent = [...pattern.values()].reduce((sum, count) => sum + count, 0);
  $('undo').disabled = undo.length === 0;
}

function render() {
  calendar = datesForYear(year);
  grid.parentElement.style.setProperty('--weeks', calendar.length / 7);
  $('year').value = year;
  $('calendar-title').textContent = translate('calendarTitle', { year });
  $('selection').textContent = translate('selection');
  $('months').replaceChildren();
  const monthFormat = new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' });
  for (const [index, date] of calendar.entries()) {
    if (!date?.endsWith('-01')) continue;
    const label = document.createElement('span');
    label.textContent = monthFormat.format(new Date(date));
    label.style.gridColumn = Math.floor(index / 7) + 1;
    $('months').append(label);
  }
  focused = calendar.findIndex(Boolean);
  cells = calendar.map((date, index) => {
    const cell = document.createElement(date ? 'button' : 'span');
    cell.className = date ? 'cell' : 'outside';
    if (date) {
      cell.type = 'button';
      cell.tabIndex = index === focused ? 0 : -1;
      cell.dataset.index = index;
    }
    return cell;
  });
  grid.replaceChildren(...cells);
  cells.forEach((_, index) => updateCell(index));
  updateTotals();
}

function brush() {
  const input = $('count');
  if (!input.checkValidity() || input.value === '') {
    $('status').textContent = translate('invalidBrush');
    return null;
  }
  return Number(input.value);
}

function setCell(index, count) {
  const date = calendar[index];
  if (!date) return;
  if (count) pattern.set(date, count);
  else pattern.delete(date);
  updateCell(index);
  $('selection').textContent = cells[index].title;
}

function record(previous) {
  if (previous.size === pattern.size && [...previous].every(([date, count]) => pattern.get(date) === count)) return;
  undo.push(previous);
  if (undo.length > 40) undo.shift();
  save();
  updateTotals();
}

function finishStroke(event) {
  if (!stroke || (event && event.pointerId !== stroke.pointer)) return;
  record(stroke.previous);
  stroke = null;
}

for (let value = MAX_YEAR; value >= 2008; value--) {
  $('year').add(new Option(value, value));
}
$('year').addEventListener('change', () => {
  finishStroke();
  save();
  year = Number($('year').value);
  pattern = readDraft(year) ?? new Map();
  undo = [];
  $('status').textContent = '';
  render();
});

for (const count of PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = count ? String(count) : translate('eraser');
  button.dataset.count = count;
  if (count) button.dataset.level = level(count);
  button.addEventListener('click', () => {
    $('count').value = count;
    refreshSwatches();
  });
  $('swatches').append(button);
}
function refreshSwatches() {
  for (const button of $('swatches').children) {
    button.setAttribute('aria-pressed', button.dataset.count === $('count').value);
  }
}
$('count').addEventListener('input', refreshSwatches);
refreshSwatches();

grid.addEventListener('focusin', event => {
  if (!event.target.matches('.cell')) return;
  cells[focused].tabIndex = -1;
  focused = Number(event.target.dataset.index);
  cells[focused].tabIndex = 0;
  $('selection').textContent = cells[focused].title;
});
grid.addEventListener('keydown', event => {
  const shifts = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
  const shift = shifts[event.key];
  if (!shift || !event.target.matches('.cell')) return;
  event.preventDefault();
  if ((shift === -1 && focused % 7 === 0) || (shift === 1 && focused % 7 === 6)) return;
  if (calendar[focused + shift]) cells[focused + shift].focus();
});
grid.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0 || !event.target.matches('.cell')) return;
  const count = brush();
  if (count === null) return;
  const index = Number(event.target.dataset.index);
  stroke = { pointer: event.pointerId, previous: new Map(pattern), index, count };
  setCell(index, count);
  updateTotals();
});
grid.addEventListener('pointermove', event => {
  if (!stroke || stroke.pointer !== event.pointerId || !event.target.matches('.cell')) return;
  const index = Number(event.target.dataset.index);
  const x = Math.floor(stroke.index / 7);
  const y = stroke.index % 7;
  const dx = Math.floor(index / 7) - x;
  const dy = index % 7 - y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i <= steps; i++) {
    setCell(Math.round(x + dx * i / steps) * 7 + Math.round(y + dy * i / steps), stroke.count);
  }
  stroke.index = index;
  updateTotals();
});
window.addEventListener('pointerup', finishStroke);
window.addEventListener('pointercancel', finishStroke);
window.addEventListener('blur', () => finishStroke());
grid.addEventListener('click', event => {
  if (!event.target.matches('.cell') || event.pointerType === 'mouse') return;
  const count = brush();
  if (count === null) return;
  const previous = new Map(pattern);
  setCell(Number(event.target.dataset.index), count);
  record(previous);
});

$('undo').addEventListener('click', () => {
  if (!undo.length) return;
  pattern = undo.pop();
  save();
  render();
});
$('clear').addEventListener('click', () => {
  const previous = new Map(pattern);
  pattern.clear();
  record(previous);
  render();
});
$('stamp').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('words').value.trim().toUpperCase();
  const count = brush();
  if (count === null) return;
  if (!/^[A-Z0-9 ]{1,8}$/.test(value)) {
    $('status').textContent = translate('invalidText');
    return;
  }
  const previous = new Map(pattern);
  for (const date of textPixels(value, calendar)) {
    if (count) pattern.set(date, count);
    else pattern.delete(date);
  }
  record(previous);
  render();
  $('status').textContent = translate('stamped', { text: value });
});
$('download').addEventListener('click', () => {
  finishStroke();
  if (!pattern.size) {
    $('status').textContent = translate('emptyCanvas');
    return;
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'contributions-' + year + '.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = translate('exported', { file: link.download });
});
$('import').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
    const next = validate(data);
    finishStroke();
    save();
    const previous = readDraft(data.year) ?? new Map();
    if (year !== data.year) undo = [];
    year = data.year;
    pattern = next;
    record(previous);
    render();
    $('status').textContent = translate('imported', { file: file.name });
  } catch (error) {
    const detail = error instanceof SyntaxError ? translate('invalidJson') : error.message;
    $('status').textContent = translate('importFailed', { detail });
  }
});

$('language').addEventListener('change', () => {
  finishStroke();
  language = $('language').value;
  try {
    localStorage.setItem('contribution-canvas:language', language);
  } catch {
    // The language still applies in this session.
  }
  applyLanguage();
});

pattern = readDraft(year) ?? new Map();
applyLanguage();
