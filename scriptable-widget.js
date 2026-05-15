// =============================================================
// Дорога к 70 · Scriptable widget
// =============================================================
// Установка:
// 1. Открой приложение Scriptable
// 2. Создай новый скрипт (кнопка +)
// 3. Вставь весь этот код, переименуй скрипт в «Дорога к 70»
// 4. На главном экране iPhone: долгий тап → «Изменить главный экран»
//    → «+» в углу → найди Scriptable → выбери средний размер
//    → добавь виджет → коснись виджета (пока режим редактирования)
//    → Script: выбери «Дорога к 70»
//
// Синхронизация с PWA:
// - В PWA нажми «экспортировать данные» (или скопируй JSON вручную)
// - Перейди в Scriptable, запусти этот скрипт
// - В меню выбери «Импорт JSON» — данные подтянутся из буфера обмена
// =============================================================

const PWA_URL = `https://donikhodjaev.github.io/k70-tracker/`;

const TARGETS = {
  weight: 70,
  calories: 1800,
  steps: 9000,
  startWeight: 85,
};

const C = {
  navy: new Color(`#0A1929`),
  navyMid: new Color(`#11233E`),
  navyDark: new Color(`#060F1C`),
  cream: new Color(`#F5EFE6`),
  cream2: new Color(`#B8B5AC`),
  cream3: new Color(`#8A8780`),
  gold: new Color(`#D4B886`),
};

// Шрифты (Cochin — встроенный iOS serif, ближайший к Cormorant Garamond)
const SERIF = (size) => new Font(`Cochin`, size);
const SANS = (size) => Font.lightSystemFont(size);
const SANS_BOLD = (size) => Font.semiboldSystemFont(size);

// =============== STORAGE ===============
const fm = FileManager.local();
const dataPath = fm.joinPath(fm.documentsDirectory(), `k70-tracker.json`);

function loadData() {
  if (!fm.fileExists(dataPath)) return { entries: {} };
  try { return JSON.parse(fm.readString(dataPath)); }
  catch (e) { return { entries: {} }; }
}

function saveData(data) {
  fm.writeString(dataPath, JSON.stringify(data));
}

// =============== HELPERS ===============
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, `0`);
  const day = String(d.getDate()).padStart(2, `0`);
  return `${y}-${m}-${day}`;
}

function calcStats(data) {
  const dates = Object.keys(data.entries).sort();
  const w = dates
    .filter(d => data.entries[d].weight)
    .map(d => ({ date: d, w: parseFloat(data.entries[d].weight) }));

  const latest = w.length ? w[w.length - 1].w : null;
  const first = w.length ? w[0].w : null;
  const lost = first !== null && latest !== null ? Math.max(0, first - latest) : 0;

  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const e = data.entries[dateKey(d)];
    if (e && (e.weight || e.calories || e.steps || (e.workout && e.workout !== `none`))) {
      streak++;
    } else if (i > 0) break;
  }

  const todayE = data.entries[dateKey(today)] || {};

  return {
    weight: latest,
    lost,
    streak,
    todayCalories: parseFloat(todayE.calories) || 0,
    todaySteps: parseFloat(todayE.steps) || 0,
    todayWorkout: todayE.workout || null,
    weightHistory: w.slice(-14),
  };
}

// =============== CHART ===============
function drawChart(data, width, height) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  if (data.length < 2) return ctx.getImage();

  const padX = 3;
  const padY = 8;
  const target = TARGETS.weight;
  const start = TARGETS.startWeight;

  const min = data.reduce((m, d) => Math.min(m, d.w), target - 1);
  const max = data.reduce((m, d) => Math.max(m, d.w), start + 1);
  const range = max - min || 1;

  const xStep = (width - padX * 2) / (data.length - 1);
  const yFor = (v) => height - padY - ((v - min) / range) * (height - padY * 2);

  // Target line (dashed gold)
  const ty = yFor(target);
  ctx.setStrokeColor(C.gold);
  ctx.setLineWidth(0.5);
  for (let x = padX; x < width - padX; x += 6) {
    const seg = new Path();
    seg.move(new Point(x, ty));
    seg.addLine(new Point(Math.min(x + 3, width - padX), ty));
    ctx.addPath(seg);
    ctx.strokePath();
  }

  // Weight line
  const path = new Path();
  data.forEach((d, i) => {
    const px = padX + i * xStep;
    const py = yFor(d.w);
    if (i === 0) path.move(new Point(px, py));
    else path.addLine(new Point(px, py));
  });
  ctx.setStrokeColor(C.cream);
  ctx.setLineWidth(1.2);
  ctx.addPath(path);
  ctx.strokePath();

  // Dots
  data.forEach((d, i) => {
    const px = padX + i * xStep;
    const py = yFor(d.w);
    const isLast = i === data.length - 1;
    ctx.setFillColor(isLast ? C.gold : C.cream);
    const r = isLast ? 2.5 : 1.5;
    ctx.fillEllipse(new Rect(px - r, py - r, r * 2, r * 2));
  });

  return ctx.getImage();
}

// =============== WIDGET ===============
function createWidget(stats) {
  const w = new ListWidget();

  const grad = new LinearGradient();
  grad.locations = [0, 0.6, 1];
  grad.colors = [C.navyMid, C.navy, C.navyDark];
  grad.startPoint = new Point(0.5, 0);
  grad.endPoint = new Point(0.5, 1);
  w.backgroundGradient = grad;

  w.setPadding(12, 14, 12, 14);
  w.url = PWA_URL;

  const family = config.widgetFamily || `medium`;

  if (family === `small`) renderSmall(w, stats);
  else if (family === `large`) renderLarge(w, stats);
  else renderMedium(w, stats);

  return w;
}

function renderSmall(w, stats) {
  const header = w.addStack();
  header.layoutHorizontally();
  const brand = header.addText(`ДОРОГА К 70`);
  brand.font = SANS(7.5);
  brand.textColor = C.cream3;
  header.addSpacer();
  const streak = header.addText(`${stats.streak} дн`);
  streak.font = SANS_BOLD(7.5);
  streak.textColor = C.cream2;

  w.addSpacer(6);

  const weight = w.addText(stats.weight !== null ? stats.weight.toFixed(1) : `—`);
  weight.font = SERIF(38);
  weight.textColor = C.cream;

  const unit = w.addText(`КГ`);
  unit.font = SANS(7);
  unit.textColor = C.cream3;

  w.addSpacer();

  const lostStack = w.addStack();
  lostStack.layoutHorizontally();
  const lostLabel = lostStack.addText(`сброшено `);
  lostLabel.font = SANS(8);
  lostLabel.textColor = C.cream3;
  const lostValue = lostStack.addText(`${stats.lost.toFixed(1)} кг`);
  lostValue.font = SANS_BOLD(8);
  lostValue.textColor = C.gold;
}

function renderMedium(w, stats) {
  // Header
  const header = w.addStack();
  header.layoutHorizontally();
  const brand = header.addText(`ДОРОГА К 70`);
  brand.font = SANS(8);
  brand.textColor = C.cream3;
  header.addSpacer();

  const streakStack = header.addStack();
  streakStack.layoutHorizontally();
  const sl = streakStack.addText(`СЕРИЯ `);
  sl.font = SANS(8);
  sl.textColor = C.cream3;
  const sv = streakStack.addText(`${stats.streak}`);
  sv.font = SANS_BOLD(8);
  sv.textColor = C.cream;
  const su = streakStack.addText(` дн`);
  su.font = SANS(8);
  su.textColor = C.cream3;

  w.addSpacer(8);

  // Main row
  const main = w.addStack();
  main.layoutHorizontally();

  // Left: weight
  const left = main.addStack();
  left.layoutVertically();

  const wv = left.addText(stats.weight !== null ? stats.weight.toFixed(1) : `—`);
  wv.font = SERIF(46);
  wv.textColor = C.cream;

  const wu = left.addText(`КГ`);
  wu.font = SANS(7);
  wu.textColor = C.cream3;

  left.addSpacer(6);

  const lostS = left.addStack();
  lostS.layoutHorizontally();
  const lostL = lostS.addText(`сброшено `);
  lostL.font = SANS(8);
  lostL.textColor = C.cream3;
  const lostV = lostS.addText(`${stats.lost.toFixed(1)} кг`);
  lostV.font = SANS_BOLD(8);
  lostV.textColor = C.gold;

  main.addSpacer();

  // Right: chart + calories + workout
  const right = main.addStack();
  right.layoutVertically();

  if (stats.weightHistory.length >= 2) {
    const chartImg = drawChart(stats.weightHistory, 165, 55);
    const img = right.addImage(chartImg);
    img.imageSize = new Size(165, 55);
  } else {
    const placeholder = right.addText(`график появится после 2+ замеров`);
    placeholder.font = SANS(7);
    placeholder.textColor = C.cream3;
    placeholder.lineLimit = 2;
    right.addSpacer(35);
  }

  right.addSpacer(6);

  const calRow = right.addStack();
  calRow.layoutHorizontally();
  calRow.centerAlignContent();

  const calLabel = calRow.addText(`КАЛ `);
  calLabel.font = SANS(7);
  calLabel.textColor = C.cream3;

  const calVal = calRow.addText(`${Math.round(stats.todayCalories)}`);
  calVal.font = SANS_BOLD(10);
  calVal.textColor = C.cream;

  const calTarget = calRow.addText(` / ${TARGETS.calories}`);
  calTarget.font = SANS(8);
  calTarget.textColor = C.cream3;

  calRow.addSpacer();

  if (stats.todayWorkout && stats.todayWorkout !== `none`) {
    const wtag = calRow.addText(`✓ ${stats.todayWorkout}`);
    wtag.font = SANS_BOLD(9);
    wtag.textColor = C.gold;
  }
}

function renderLarge(w, stats) {
  renderMedium(w, stats);

  w.addSpacer(14);

  const sep = w.addStack();
  sep.addSpacer();
  const dash = sep.addText(`───────`);
  dash.font = SANS(6);
  dash.textColor = C.cream3;
  sep.addSpacer();

  w.addSpacer(10);

  // До цели
  const tgt = w.addStack();
  tgt.layoutHorizontally();
  tgt.centerAlignContent();
  const tl = tgt.addText(`ДО ЦЕЛИ `);
  tl.font = SANS(8);
  tl.textColor = C.cream3;
  const remaining = stats.weight !== null
    ? Math.max(0, stats.weight - TARGETS.weight).toFixed(1)
    : `—`;
  const tv = tgt.addText(`${remaining}`);
  tv.font = SERIF(22);
  tv.textColor = C.gold;
  const tu = tgt.addText(` кг`);
  tu.font = SANS(8);
  tu.textColor = C.cream3;

  tgt.addSpacer();

  const stepsLabel = tgt.addText(`ШАГИ `);
  stepsLabel.font = SANS(8);
  stepsLabel.textColor = C.cream3;
  const stepsV = tgt.addText(`${Math.round(stats.todaySteps)}`);
  stepsV.font = SANS_BOLD(10);
  stepsV.textColor = C.cream;
  const stepsT = tgt.addText(` / ${TARGETS.steps}`);
  stepsT.font = SANS(8);
  stepsT.textColor = C.cream3;
}

// =============== IN-APP UI ===============
async function showMenu(data) {
  const a = new Alert();
  a.title = `Дорога к 70`;
  a.message = `Сегодня · ${formatToday()}`;
  a.addAction(`Записать вес`);
  a.addAction(`Записать калории`);
  a.addAction(`Записать шаги`);
  a.addAction(`Отметить тренировку`);
  a.addAction(`Импорт JSON (из буфера)`);
  a.addAction(`Экспорт JSON (в буфер)`);
  a.addCancelAction(`Закрыть`);

  const idx = await a.present();
  const today = dateKey(new Date());
  if (!data.entries[today]) data.entries[today] = {};

  if (idx === 0) {
    const v = await prompt(`Вес сегодня`, `85.0`, data.entries[today].weight);
    if (v !== null) {
      if (v.length === 0) delete data.entries[today].weight;
      else data.entries[today].weight = v;
      cleanupEntry(data, today);
      saveData(data);
    }
  } else if (idx === 1) {
    const v = await prompt(`Калории сегодня`, `1800`, data.entries[today].calories);
    if (v !== null) {
      if (v.length === 0) delete data.entries[today].calories;
      else data.entries[today].calories = v;
      cleanupEntry(data, today);
      saveData(data);
    }
  } else if (idx === 2) {
    const v = await prompt(`Шаги сегодня`, `9000`, data.entries[today].steps);
    if (v !== null) {
      if (v.length === 0) delete data.entries[today].steps;
      else data.entries[today].steps = v;
      cleanupEntry(data, today);
      saveData(data);
    }
  } else if (idx === 3) {
    const wa = new Alert();
    wa.title = `Тренировка сегодня`;
    wa.addAction(`A · ноги`);
    wa.addAction(`B · спина`);
    wa.addAction(`C · полное`);
    wa.addAction(`Удалить`);
    wa.addCancelAction(`Отмена`);
    const widx = await wa.present();
    if (widx === 0) data.entries[today].workout = `A`;
    else if (widx === 1) data.entries[today].workout = `B`;
    else if (widx === 2) data.entries[today].workout = `C`;
    else if (widx === 3) delete data.entries[today].workout;
    else return;
    cleanupEntry(data, today);
    saveData(data);
  } else if (idx === 4) {
    await importJSON(data);
  } else if (idx === 5) {
    await exportJSON(data);
  }
}

function cleanupEntry(data, key) {
  const e = data.entries[key];
  if (e && Object.keys(e).length === 0) delete data.entries[key];
}

function formatToday() {
  const d = new Date();
  const months = [`января`,`февраля`,`марта`,`апреля`,`мая`,`июня`,
                  `июля`,`августа`,`сентября`,`октября`,`ноября`,`декабря`];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

async function prompt(title, placeholder, defaultValue) {
  const a = new Alert();
  a.title = title;
  a.addTextField(placeholder, defaultValue ? String(defaultValue) : String.fromCharCode());
  a.addAction(`Сохранить`);
  a.addCancelAction(`Отмена`);
  const idx = await a.present();
  if (idx === 0) return a.textFieldValue(0).trim();
  return null;
}

async function importJSON(data) {
  const json = Pasteboard.paste();
  if (!json || json.length < 5) {
    const a = new Alert();
    a.title = `Буфер пуст`;
    a.message = `Скопируй JSON из PWA (кнопка «экспортировать данные») и попробуй снова.`;
    a.addAction(`OK`);
    await a.present();
    return;
  }
  try {
    const parsed = JSON.parse(json);
    const newEntries = parsed.entries || parsed;
    let count = 0;
    for (const key in newEntries) {
      data.entries[key] = newEntries[key];
      count++;
    }
    saveData(data);
    const a = new Alert();
    a.title = `Импортировано`;
    a.message = `${count} записей объединено с текущими данными.`;
    a.addAction(`OK`);
    await a.present();
  } catch (e) {
    const a = new Alert();
    a.title = `Ошибка`;
    a.message = `В буфере не JSON или он повреждён.`;
    a.addAction(`OK`);
    await a.present();
  }
}

async function exportJSON(data) {
  Pasteboard.copy(JSON.stringify(data, null, 2));
  const a = new Alert();
  a.title = `Экспортировано`;
  a.message = `${Object.keys(data.entries).length} записей скопированы в буфер обмена. Теперь можно вставить в PWA или в заметку.`;
  a.addAction(`OK`);
  await a.present();
}

// =============== MAIN ===============
const data = loadData();
const stats = calcStats(data);

if (config.runsInWidget) {
  Script.setWidget(createWidget(stats));
} else {
  await showMenu(data);
  const newStats = calcStats(loadData());
  const widget = createWidget(newStats);
  await widget.presentMedium();
}
Script.complete();
