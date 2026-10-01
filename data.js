// On-device data layer. Same routes the old server had, stored in localStorage on the phone.
const KEY = 'striide.data';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const blank = () => ({
  profile: { name: '', focus_areas: [], morning: '07:00', evening: '21:00', reminders: false, onboarded: false },
  habits: [], completions: [], notes: [], seq: 1,
});

function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return blank(); }
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch { throw new Error('Couldn’t save on this device'); }
}
// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.().catch(() => {});

const need = (cond, msg) => { if (!cond) throw new Error(msg); };
const nextId = () => db.seq++;
const active = () => db.habits.filter(h => !h.archived).sort((a, b) => a.position - b.position || a.id - b.id);
const pub = h => ({ id: h.id, name: h.name, target: h.target, minutes: h.minutes });

function shiftDay(day, delta) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Consecutive days where every active habit was closed. An unfinished today doesn't break it.
function streak(day) {
  const ids = new Set(active().map(h => h.id));
  if (!ids.size) return 0;
  const counts = new Map();
  for (const c of db.completions) if (ids.has(c.habit_id)) counts.set(c.day, (counts.get(c.day) ?? 0) + 1);
  let cur = (counts.get(day) ?? 0) >= ids.size ? day : shiftDay(day, -1);
  let total = 0;
  while ((counts.get(cur) ?? 0) >= ids.size) { total++; cur = shiftDay(cur, -1); }
  return total;
}

function tip() {
  const timed = new Set(db.habits.filter(h => h.minutes).map(h => h.id));
  const hours = db.completions.filter(c => timed.has(c.habit_id) && c.hour != null).map(c => c.hour);
  if (hours.length >= 3) {
    const share = hours.filter(h => h < 12).length / hours.length;
    if (share >= 0.6) return 'Most of your timed sessions happen before noon. Consider protecting your mornings.';
    if (share <= 0.3) return 'You tend to finish timed sessions later in the day. Plan them for when you have energy.';
  }
  return 'Same time tomorrow makes it easier. Consistency beats intensity.';
}

function week(day) {
  const start = shiftDay(day, -6);
  const habits = active().map(h => {
    const n = db.completions.filter(c => c.habit_id === h.id && c.day >= start && c.day <= day).length;
    return { id: h.id, name: h.name, pct: Math.round((n / 7) * 100) };
  });
  let insight = 'Your first week starts now. Check back in a few days.';
  const any = habits.some(h => h.pct > 0);
  if (any && habits.length > 1) {
    const sorted = [...habits].sort((a, b) => a.pct - b.pct);
    const low = sorted[0], high = sorted.at(-1);
    insight = low.pct === high.pct
      ? (low.pct === 100 ? 'Every habit, every day this week. Keep the rhythm.' : `Your habits are evenly matched at ${low.pct}% this week.`)
      : `${low.name} is your lowest this week at ${low.pct}%. ${high.name} is your strongest at ${high.pct}%.`;
  } else if (any) {
    insight = `${habits[0].name} landed on ${habits[0].pct}% of days this week.`;
  }
  const byId = new Map(db.habits.map(h => [h.id, h]));
  const sessions = db.completions
    .filter(c => byId.has(c.habit_id))
    .sort((a, b) => b.day.localeCompare(a.day) || byId.get(a.habit_id).position - byId.get(b.habit_id).position)
    .slice(0, 30)
    .map(c => ({ day: c.day, seconds: c.seconds, name: byId.get(c.habit_id).name }));
  return { start, end: day, habits, insight, sessions };
}

const routes = {
  'GET /state': ({ query }) => {
    const day = query.get('day');
    need(DAY_RE.test(day ?? ''), 'day must be YYYY-MM-DD');
    const done = Object.fromEntries(db.completions.filter(c => c.day === day).map(c => [c.habit_id, c.seconds]));
    return { profile: db.profile, habits: active().map(pub), done, streak: streak(day), tip: tip() };
  },

  'PUT /profile': ({ body }) => {
    const p = db.profile;
    if ('name' in body) p.name = String(body.name ?? '').trim().slice(0, 40);
    for (const k of ['morning', 'evening']) if (k in body) { need(TIME_RE.test(body[k]), `${k} must be HH:MM`); p[k] = body[k]; }
    for (const k of ['reminders', 'onboarded']) if (k in body) p[k] = !!body[k];
    if ('focus_areas' in body) {
      need(Array.isArray(body.focus_areas) && body.focus_areas.length <= 3, 'choose up to 3 focus areas');
      p.focus_areas = body.focus_areas.map(String);
    }
    save();
    return p;
  },

  // Replace the active list. Removed habits are archived so history survives.
  'PUT /habits': ({ body }) => {
    const list = body.habits;
    need(Array.isArray(list) && list.length >= 1 && list.length <= 3, 'choose 1 to 3 habits');
    const rows = list.map((h, position) => {
      const name = String(h.name ?? '').trim().slice(0, 40);
      need(name, 'habit name is required');
      const minutes = Number.isInteger(h.minutes) && h.minutes > 0 && h.minutes <= 240 ? h.minutes : null;
      return { id: h.id, name, target: String(h.target ?? '').trim().slice(0, 20), minutes, position, archived: false };
    });
    const keep = new Set();
    for (const r of rows) {
      const existing = r.id && db.habits.find(h => h.id === r.id);
      if (existing) Object.assign(existing, r);
      else db.habits.push({ ...r, id: nextId() });
      keep.add(existing ? r.id : db.habits.at(-1).id);
    }
    for (const h of db.habits) if (!keep.has(h.id)) h.archived = true;
    save();
    return active().map(pub);
  },

  'POST /completions': ({ body }) => {
    need(DAY_RE.test(body.day ?? ''), 'day must be YYYY-MM-DD');
    const habit = db.habits.find(h => h.id === body.habit_id);
    need(habit, 'unknown habit');
    const row = {
      habit_id: body.habit_id, day: body.day,
      seconds: Math.max(0, Math.round(Number(body.seconds) || 0)),
      hour: Number.isInteger(body.hour) && body.hour >= 0 && body.hour < 24 ? body.hour : null,
    };
    // Timed habits only count once the full timer has run.
    need(!habit.minutes || row.seconds >= habit.minutes * 60, 'Finish the timer to check this off');
    db.completions = db.completions.filter(c => !(c.habit_id === row.habit_id && c.day === row.day));
    db.completions.push(row);
    save();
    return { ok: true };
  },

  'DELETE /completions': ({ body }) => {
    db.completions = db.completions.filter(c => !(c.habit_id === body.habit_id && c.day === body.day));
    save();
    return { ok: true };
  },

  'GET /notes': ({ query }) => {
    const day = query.get('day');
    need(DAY_RE.test(day ?? ''), 'day must be YYYY-MM-DD');
    return db.notes.filter(n => n.day === day).sort((a, b) => b.id - a.id);
  },

  'POST /notes': ({ body }) => {
    need(DAY_RE.test(body.day ?? ''), 'day must be YYYY-MM-DD');
    const text = String(body.body ?? '').trim().slice(0, 5000);
    need(text, 'note is empty');
    const id = nextId();
    db.notes.push({ id, day: body.day, body: text, created_at: new Date().toISOString() });
    save();
    return { id };
  },

  'DELETE /notes': ({ body }) => {
    db.notes = db.notes.filter(n => n.id !== body.id);
    save();
    return { ok: true };
  },

  'GET /week': ({ query }) => {
    const day = query.get('day');
    need(DAY_RE.test(day ?? ''), 'day must be YYYY-MM-DD');
    return week(day);
  },

  'POST /reset': () => {
    db = blank();
    save();
    return { ok: true };
  },
};

export function request(path, method = 'GET', body = {}) {
  const url = new URL(path, 'https://local');
  const route = routes[`${method} ${url.pathname}`];
  if (!route) throw new Error('not found');
  // Hand back a copy so screens can't mutate stored data by accident.
  return structuredClone(route({ body: body ?? {}, query: url.searchParams }));
}
