// =============================================================
// Дорога к 70 · умные уведомления
// =============================================================
// Этот скрипт проверяет, что записано за сегодня, и шлёт
// уведомление только если что-то пропущено. Без спама.
//
// УСТАНОВКА:
// 1. Создай новый скрипт в Scriptable, вставь этот код
// 2. Сохрани как «K70 уведомления»
// 3. Открой приложение «Команды» (Shortcuts)
// 4. Вкладка «Автоматизация» внизу → «+» в углу
// 5. «Создать автоматизацию для себя» → «Время суток»
// 6. Установи время 21:00, повтор «Ежедневно», жми «Далее»
// 7. «Добавить действие» → найди Scriptable → «Запустить скрипт»
// 8. Выбери «K70 уведомления» → «Далее»
// 9. ВЫКЛЮЧИ переключатель «Спрашивать перед запуском»
// 10. Готово
//
// Теперь каждый день в 21:00 будет проверка:
// - если вес сегодня не записан → уведомление «не забудь вес»
// - если сегодня тренировочный день (Пн/Ср/Пт) и тренировка
//   не отмечена → уведомление об этом
// - если калории не записаны → уведомление «запиши пока помнишь»
// =============================================================

const PWA_URL = `https://donikhodjaev.github.io/k70-tracker/`;

const fm = FileManager.local();
const dataPath = fm.joinPath(fm.documentsDirectory(), `k70-tracker.json`);

function loadData() {
  if (!fm.fileExists(dataPath)) return { entries: {} };
  try { return JSON.parse(fm.readString(dataPath)); }
  catch (e) { return { entries: {} }; }
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, `0`);
  const day = String(d.getDate()).padStart(2, `0`);
  return `${y}-${m}-${day}`;
}

const data = loadData();
const now = new Date();
const todayKey = dateKey(now);
const entry = data.entries[todayKey] || {};

const dayOfWeek = now.getDay(); // 0=вс, 1=пн, 2=вт, 3=ср, 4=чт, 5=пт, 6=сб
const isWorkoutDay = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
const workoutName = dayOfWeek === 1 ? `A (ноги + жим)`
                  : dayOfWeek === 3 ? `B (спина + кор)`
                  : dayOfWeek === 5 ? `C (полное тело)`
                  : null;

const hasWeight = entry.weight && parseFloat(entry.weight) > 0;
const hasCalories = entry.calories && parseFloat(entry.calories) > 0;
const hasWorkout = entry.workout && entry.workout !== `none`;

const queue = [];

if (!hasWeight) {
  queue.push({
    title: `Дорога к 70`,
    body: `Вес за сегодня не записан. Открой трекер и внеси.`,
  });
}

if (isWorkoutDay && !hasWorkout) {
  queue.push({
    title: `Тренировка ${workoutName}`,
    body: `Сегодня запланирована тренировка. Если сделал — отметь в трекере. Если нет — ещё успеваешь.`,
  });
}

if (!hasCalories) {
  queue.push({
    title: `Калории за день`,
    body: `Запиши, что съел сегодня, пока помнишь.`,
  });
}

for (let i = 0; i < queue.length; i++) {
  const item = queue[i];
  const n = new Notification();
  n.title = item.title;
  n.body = item.body;
  n.sound = `default`;
  n.openURL = PWA_URL;
  // если уведомлений несколько — разносим по 30 секунд, чтобы не сливались
  if (i > 0) {
    const fire = new Date(Date.now() + i * 30 * 1000);
    n.setTriggerDate(fire);
  }
  await n.schedule();
}

// Лог в консоль Scriptable (видно при ручном запуске)
console.log(`Проверка ${todayKey}: вес=${hasWeight}, калории=${hasCalories}, тренировка=${hasWorkout}`);
console.log(`Уведомлений отправлено: ${queue.length}`);

Script.complete();
