// =============================================================
// Дорога к 70 · импорт из Shortcuts / Siri / Health
// =============================================================
// Универсальный скрипт. Принимает данные из приложения «Команды»
// и записывает в трекер. Используется в нескольких шорткатах:
//
// 1. «Записать вес» — Siri-вызываемый, спрашивает число
// 2. «Синхр. шагов из Health» — авто, ежедневно
// 3. «Синхр. веса из Health» — авто, для умных весов
//
// Установка скрипта:
// 1. Создай новый скрипт в Scriptable
// 2. Вставь этот код
// 3. Назови «K70 импорт»
// 4. Сохрани
//
// Дальше — конфигурации трёх шорткатов будут отдельно.
// =============================================================

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

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, `0`);
  const day = String(d.getDate()).padStart(2, `0`);
  return `${y}-${m}-${day}`;
}

// ============ ПАРСИНГ ВХОДА ============
// Shortcuts может передать:
// - args.shortcutParameter — если передан Dictionary или Number
// - args.plainTexts — массив текстов
// - args.numbers — массив чисел

let parsed = {};
const sp = args.shortcutParameter;
const plain = (args.plainTexts && args.plainTexts.length > 0) ? args.plainTexts[0] : null;
const num = (args.numbers && args.numbers.length > 0) ? args.numbers[0] : null;

if (sp !== null && typeof sp === `object`) {
  // Dictionary из Shortcuts
  if (sp.weight !== undefined) parsed.weight = String(sp.weight);
  if (sp.steps !== undefined) parsed.steps = String(Math.round(parseFloat(sp.steps)));
  if (sp.calories !== undefined) parsed.calories = String(Math.round(parseFloat(sp.calories)));
  if (sp.workout !== undefined) parsed.workout = String(sp.workout);
  if (sp.date !== undefined) parsed.date = String(sp.date);
} else if (sp !== null && (typeof sp === `string` || typeof sp === `number`)) {
  // Одиночное значение — трактуем как вес
  const v = parseFloat(sp);
  if (!isNaN(v) && v > 0) parsed.weight = String(v);
} else if (num !== null) {
  const v = parseFloat(num);
  if (!isNaN(v) && v > 0) parsed.weight = String(v);
} else if (plain !== null) {
  const v = parseFloat(plain);
  if (!isNaN(v) && v > 0) parsed.weight = String(v);
}

// ============ ЗАПИСЬ ============
const data = loadData();
const targetDate = parsed.date || dateKey(new Date());
if (!data.entries[targetDate]) data.entries[targetDate] = {};

const changes = [];
if (parsed.weight) {
  data.entries[targetDate].weight = parsed.weight;
  changes.push(`вес ${parsed.weight} кг`);
}
if (parsed.steps) {
  data.entries[targetDate].steps = parsed.steps;
  changes.push(`${parsed.steps} шагов`);
}
if (parsed.calories) {
  data.entries[targetDate].calories = parsed.calories;
  changes.push(`${parsed.calories} ккал`);
}
if (parsed.workout) {
  data.entries[targetDate].workout = parsed.workout;
  changes.push(`тренировка ${parsed.workout}`);
}

saveData(data);

// ============ ВЫХОД ============
const result = changes.length > 0
  ? `Сохранено: ${changes.join(`, `)}`
  : `Нет данных для записи`;

// Возвращаем результат обратно в Shortcuts
Script.setShortcutOutput(result);

// Озвучка если вызвано через Siri
if (config.runsWithSiri) {
  Speech.speak(result);
}

// Уведомление если запущен НЕ через Siri и НЕ напрямую интерактивно
if (!config.runsWithSiri && config.runsInApp) {
  const a = new Alert();
  a.title = `K70 импорт`;
  a.message = result;
  a.addAction(`OK`);
  await a.present();
}

Script.complete();
