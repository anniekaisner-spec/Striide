// Striide frontend: one module, hash routes, one render function per screen.
import { request } from './data.js';
const app = document.getElementById('app');
const menuEl = document.getElementById('menu');

// ---------- utilities ----------
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = sel => app.querySelector(sel);
const on = (sel, ev, fn) => app.querySelectorAll(sel).forEach(el => el.addEventListener(ev, fn));
const go = path => { location.hash = '#/' + path; };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// Data lives on the device; api() keeps the same shape the screens already use.
async function api(path, method = 'GET', body) {
  return request(path, method, body);
}

function toast(msg) {
  const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
}

const icon = {
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 20v-6M12 20V6M18 20v-10"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  pen: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  bulb: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></svg>',
};
const menuBtn = '<button class="icon-btn" data-menu aria-label="Menu">' + icon.menu + '</button>';
const pillNav = order => `<div class="pill">${order.map(k => ({
  gear: `<button class="icon-btn" data-nav="schedule" aria-label="Reminders">${icon.gear}</button>`,
  chart: `<button class="icon-btn" data-nav="progress" aria-label="Progress">${icon.chart}</button>`,
  menu: menuBtn,
})[k]).join('')}</div>`;
const backBtn = to => `<button class="back" data-nav="${to}" aria-label="Back">${icon.back}</button>`;
const habitLabel = h => h.target ? `${h.name} · ${h.target}` : h.name;

// Starter habits, keyed by the focus areas on the Goals screen.
const AREAS = ['Focus', 'Sleep', 'Reflection', 'Movement', 'Reading'];
const MORE_AREAS = ['Mindfulness', 'Hydration'];
const TEMPLATES = {
  Focus: { name: 'Deep focus', target: '30 min', minutes: 30 },
  Sleep: { name: 'Sleep 8 hrs', target: '8 hrs' },
  Reflection: { name: 'Journaling', target: '3 pages' },
  Movement: { name: 'Walk', target: '20 min', minutes: 20 },
  Reading: { name: 'Read', target: '20 pages' },
  Mindfulness: { name: 'Meditate', target: '10 min', minutes: 10 },
  Hydration: { name: 'Water', target: '8 glasses' },
};
// "Stretch 15 min" → a timed habit. Anything else is a simple check-off.
function parseHabit(text) {
  const m = text.match(/^(.*?)[\s·-]*(\d{1,3})\s*min(ute)?s?$/i);
  return m && m[1].trim() ? { name: m[1].trim(), target: `${m[2]} min`, minutes: Number(m[2]) } : { name: text.trim(), target: '' };
}

// ---------- state ----------
let S = null; // { profile, habits, done, streak, tip }
const refresh = async () => { S = await api('/state?day=' + today()); };
const isDone = h => h.id in S.done;
const nextHabit = () => S.habits.find(h => !isDone(h));
const draft = { habits: null, areas: null, moreAreas: false }; // unsaved onboarding choices

// Starting a habit: timed ones get a session, the rest are checked off on the spot.
async function startHabit(h) {
  if (h.minutes) return go('session/' + h.id);
  await complete(h, 0);
  go('done/' + h.id);
}
async function complete(h, seconds) {
  await api('/completions', 'POST', { habit_id: h.id, day: today(), seconds, hour: new Date().getHours() });
  store.del(timerKey(h.id));
  await refresh();
}

// ---------- screens ----------
// Each returns { theme, html, mount? }.
const screens = {
  intro: () => ({
    theme: 'dark',
    html: `<div class="grow center" style="display:flex;flex-direction:column;justify-content:center;gap:14px">
      <div class="wordmark" style="font-size:22px">striide</div>
      <div class="dots intro-dots" style="justify-content:center"><i></i><i></i></div></div>`,
    mount: () => { timers.push(setTimeout(() => go('splash'), 1600)); app.onclick = () => go('splash'); },
  }),

  splash: () => ({
    theme: 'dark',
    html: `<div class="wordmark tiny">striide</div>
      <h1 class="h-xl mt-l">Build<br>habits<br>that<br><span class="it ghost">stick.</span></h1>
      <div class="dots mt"><i class="on"></i><i class="on"></i><i></i></div>
      <div class="grow"></div>
      <p class="small ghost">Choose your goals.<br>Track your progress.<br>Stay consistent.</p>
      <button class="btn btn-lime mt" data-nav="personalize">Get started</button>`,
  }),

  personalize: () => ({
    theme: 'cream',
    html: `<div class="head"><span class="label">Profile</span><span class="step">1</span></div>
      <h1 class="h1 mt">Personalize<br>your<br>experience.</h1>
      <div class="mt-s">↓</div>
      <form class="soft-card mt" id="f">
        <input class="field" name="name" placeholder="First name..." autocomplete="given-name" maxlength="40" value="${esc(S.profile.name)}">
        <p class="tiny mt-s">Optional — no account needed to start.</p>
      </form>
      <div class="grow"></div>
      <button class="btn btn-outline btn-narrow" form="f">Continue</button>
      <button class="link" data-nav="goals">Skip</button>`,
    mount: () => on('#f', 'submit', async e => {
      e.preventDefault();
      S.profile = await api('/profile', 'PUT', { name: new FormData(e.target).get('name') });
      go('goals');
    }),
  }),

  goals: () => {
    draft.areas ??= new Set(S.profile.focus_areas);
    draft.moreAreas ||= MORE_AREAS.some(a => draft.areas.has(a));
    const picked = draft.areas;
    const chip = a => `<button class="chip" data-area="${a}" aria-pressed="${picked.has(a)}">${a}</button>`;
    return {
      theme: 'cream',
      html: `<div class="head"><span class="label">Focus areas</span>${menuBtn}</div>
        <h1 class="h1 mt">What are<br>your goals?</h1>
        <div class="chips mt-l">${AREAS.map(chip).join('')}
          ${draft.moreAreas ? MORE_AREAS.map(chip).join('') : '<button class="chip" id="more">Explore more...</button>'}</div>
        <p class="tiny mt-s" style="text-align:center">Choose up to 3. You can edit later.</p>
        <div class="grow"></div>
        <button class="btn btn-ink mt" id="next">Continue</button>`,
      mount: () => {
        on('[data-area]', 'click', e => {
          const a = e.currentTarget.dataset.area;
          if (picked.has(a)) picked.delete(a);
          else if (picked.size < 3) picked.add(a);
          else return toast('Up to 3 for now');
          e.currentTarget.setAttribute('aria-pressed', picked.has(a));
        });
        on('#more', 'click', () => { draft.moreAreas = true; render(); });
        on('#next', 'click', async () => {
          S.profile = await api('/profile', 'PUT', { focus_areas: [...picked] });
          draft.areas = null;
          draft.habits = null;
          go('habits');
        });
      },
    };
  },

  habits: () => {
    if (!draft.habits) {
      draft.habits = S.habits.length
        ? S.habits.map(h => ({ ...h }))
        : S.profile.focus_areas.map(a => ({ ...TEMPLATES[a] })).filter(h => h.name);
    }
    const editing = S.profile.onboarded;
    const list = () => draft.habits.map((h, i) => `
      <div class="habit-input"><b>${i + 1}.</b><input data-i="${i}" value="${esc(habitLabel(h))}" maxlength="40" aria-label="Habit ${i + 1}">
      <button data-rm="${i}" aria-label="Remove">×</button></div>`).join('');
    const unused = Object.values(TEMPLATES).filter(t => !draft.habits.some(h => h.name === t.name));
    return {
      theme: 'cream',
      html: `<div class="head">${editing ? backBtn('home') : '<span class="label">Choose your habits</span>'}${menuBtn}</div>
        <h1 class="h1 mt">Choose your<br>top 3 daily<br>habits.</h1>
        <div class="soft-card mt stack">
          ${list()}
          ${draft.habits.length < 3 ? '<form id="add"><input class="field field-ghost" name="h" placeholder="+ Add a habit..." maxlength="40"></form>' : ''}
          <button class="tiny" id="tpl-toggle" style="display:block;margin:12px auto 0">Or select existing templates →</button>
          <div class="templates mt-s" id="tpl" hidden>${unused.map(t => `<button data-tpl="${esc(t.name)}">${esc(habitLabel(t))}</button>`).join('')}</div>
        </div>
        <p class="tiny mt-s">Add a time like “20 min” to make it a timed session.</p>
        <div class="grow"></div>
        <button class="btn btn-ink lime-text mt" id="next" ${draft.habits.length ? '' : 'disabled'}>${editing ? 'Save habits' : 'Next steps'}</button>`,
      mount: () => {
        const rerender = () => render();
        on('[data-i]', 'change', e => {
          const i = Number(e.target.dataset.i), v = e.target.value.trim();
          if (!v) draft.habits.splice(i, 1);
          else draft.habits[i] = { ...draft.habits[i], ...parseHabit(v), minutes: parseHabit(v).minutes ?? null };
          rerender();
        });
        on('[data-rm]', 'click', e => { draft.habits.splice(Number(e.currentTarget.dataset.rm), 1); rerender(); });
        on('#add', 'submit', e => {
          e.preventDefault();
          const v = new FormData(e.target).get('h').trim();
          if (v) { draft.habits.push(parseHabit(v)); rerender(); }
        });
        on('#tpl-toggle', 'click', () => { $('#tpl').hidden = !$('#tpl').hidden; });
        on('[data-tpl]', 'click', e => {
          if (draft.habits.length >= 3) return toast('Remove one first. Three is the limit.');
          draft.habits.push({ ...Object.values(TEMPLATES).find(t => t.name === e.currentTarget.dataset.tpl) });
          rerender();
        });
        on('#next', 'click', async () => {
          // Pick up an edit still sitting in a focused input.
          document.activeElement?.blur?.();
          try {
            S.habits = await api('/habits', 'PUT', { habits: draft.habits });
            draft.habits = null;
            await refresh();
            go(editing ? 'home' : 'schedule');
          } catch (err) { toast(err.message); }
        });
      },
    };
  },

  schedule: () => {
    const editing = S.profile.onboarded;
    const row = (key, title, sub) => `<label class="time-row"><span><b class="small">${title}</b><br><span class="tiny">${sub}</span></span>
      <input type="time" name="${key}" value="${S.profile[key]}"></label>`;
    return {
      theme: 'cream',
      html: `<div class="head">${editing ? backBtn('home') : '<span class="label">Reminders</span>'}${menuBtn}</div>
        <h1 class="h1 mt">Set your<br>schedule.</h1>
        <p class="tiny mt-s">Reminders are optional</p>
        <form id="f" class="stack mt-l">
          ${row('morning', 'Morning check in', 'Write goal completion')}
          ${row('evening', 'Evening log', 'Mark goal completion')}
        </form>
        <div class="grow"></div>
        <button class="btn btn-ink lime-text mt" id="enable">${S.profile.reminders ? 'Save schedule' : 'Enable notifications'}</button>
        <button class="link" id="skip">${editing && S.profile.reminders ? 'Turn reminders off' : 'Skip'}</button>`,
      mount: () => {
        const save = async reminders => {
          const f = new FormData($('#f'));
          S.profile = await api('/profile', 'PUT', { morning: f.get('morning'), evening: f.get('evening'), reminders });
          go(editing ? 'home' : 'ready');
        };
        on('#enable', 'click', async () => {
          let ok = true;
          if ('Notification' in window && Notification.permission !== 'granted') ok = (await Notification.requestPermission()) === 'granted';
          if (!ok) toast('Notifications are blocked in your browser settings');
          save(ok);
        });
        on('#skip', 'click', () => save(false));
      },
    };
  },

  ready: () => ({
    theme: 'cream',
    html: `<div class="head">${backBtn('schedule')}</div>
      <div class="grow center" style="display:flex;flex-direction:column;justify-content:center">
        <div class="check-orb" style="margin:0 auto">${icon.check.replace('stroke-width="3"', 'stroke-width="2.5" width="40" height="40"')}</div>
        <h1 class="h1 mt-l" style="font-size:24px"><span class="it">You're set${S.profile.name ? ',' : '.'}</span>${S.profile.name ? `<br>${esc(S.profile.name)}.` : ''}</h1>
        <p class="tiny mt-s">${S.habits.length} habit${S.habits.length === 1 ? '' : 's'} locked in. You're ready to show up.</p>
      </div>
      <button class="btn btn-ink lime-text btn-narrow" id="go" style="min-width:70%">Go to today</button>`,
    mount: () => on('#go', 'click', async () => {
      S.profile = await api('/profile', 'PUT', { onboarded: true });
      go('home');
    }),
  }),

  home: () => {
    const next = nextHabit();
    const left = S.habits.filter(h => !isDone(h)).length;
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).replace(',', ' ·');
    return {
      theme: 'gray',
      html: `<div class="head"><span class="label">Home</span>${pillNav(['gear', 'chart', 'menu'])}</div>
        <p class="label mt-l" style="font-size:10px">${esc(date)}</p>
        <button class="today-card mt-s" id="today">
          <span class="label" style="font-size:9px">Today</span>
          <div class="h1 mt-s" style="font-size:24px">${next ? esc(next.name) : 'All done.'}</div>
          <p class="small" style="opacity:.85;margin-top:4px">${next ? `${next.target ? esc(next.target) + ' · ' : ''}tap to begin` : 'See how today went'}</p>
          <p class="tiny" style="margin-top:6px">${left} of ${S.habits.length} habits left today</p>
        </button>
        <p class="label mt" style="color:var(--ink);font-weight:600;font-size:10px">Habits</p>
        <div class="stack mt-s">
          ${S.habits.map(h => `<div class="habit-row ${isDone(h) ? 'is-done' : ''}">
            <button class="ring ${isDone(h) ? 'done' : ''}" data-toggle="${h.id}" aria-label="${isDone(h) ? 'Undo' : 'Complete'} ${esc(h.name)}">${isDone(h) ? icon.check : ''}</button>
            <span class="name">${esc(h.name)}</span>
            ${isDone(h) ? '<span class="go">DONE</span>' : `<button class="go" data-start="${h.id}">START</button>`}</div>`).join('')}
        </div>
        <button class="notes-row mt" data-nav="notes">${icon.pen} Notes <span class="chev">›</span></button>
        <p class="quote mt">“Small steps finish the mile.”</p>
        <div class="grow"></div>
        <button class="btn btn-lime mt" id="continue">Continue</button>`,
      mount: () => {
        const cont = () => (next ? startHabit(next) : go('alldone'));
        on('#today', 'click', cont);
        on('#continue', 'click', cont);
        on('[data-start]', 'click', e => startHabit(S.habits.find(h => h.id == e.currentTarget.dataset.start)));
        on('[data-toggle]', 'click', async e => {
          const h = S.habits.find(x => x.id == e.currentTarget.dataset.toggle);
          if (isDone(h)) await api('/completions', 'DELETE', { habit_id: h.id, day: today() });
          else if (h.minutes) return startHabit(h);
          else await api('/completions', 'POST', { habit_id: h.id, day: today(), seconds: 0, hour: new Date().getHours() });
          await refresh();
          render();
        });
      },
    };
  },

  notes: async () => {
    const notes = await api('/notes?day=' + today());
    return {
      theme: 'grid',
      html: `<div class="head"><div class="row">${backBtn('home')}<span class="label">My notes</span></div>${menuBtn}</div>
        <div class="note-pad mt">
          <div class="row between"><span class="tiny">Today</span><span style="color:#8A8A8A">${icon.pen}</span></div>
          <textarea id="body" placeholder="What's on your mind?" maxlength="5000"></textarea>
        </div>
        <div class="stack mt">${notes.map(n => `<div class="note-item">${esc(n.body)}<button class="x" data-del="${n.id}" aria-label="Delete note">×</button></div>`).join('')}</div>
        <div class="grow"></div>
        <button class="btn btn-outline btn-narrow mt" id="save">Save</button>`,
      mount: () => {
        const ta = $('#body');
        ta.value = store.get('striide.noteDraft') ?? '';
        ta.addEventListener('input', () => store.set('striide.noteDraft', ta.value));
        on('#save', 'click', async () => {
          if (!ta.value.trim()) return ta.focus();
          await api('/notes', 'POST', { day: today(), body: ta.value });
          store.del('striide.noteDraft');
          render();
        });
        on('[data-del]', 'click', async e => { await api('/notes', 'DELETE', { id: Number(e.currentTarget.dataset.del) }); render(); });
      },
    };
  },

  session: id => {
    const h = S.habits.find(x => x.id == id);
    if (!h || !h.minutes) return go('home');
    const goal = h.minutes * 60;
    const key = timerKey(h.id);
    const t = store.get(key) ?? { elapsed: 0, startedAt: null };
    const elapsed = () => Math.min(goal, t.elapsed + (t.startedAt ? (Date.now() - t.startedAt) / 1000 : 0));
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    return {
      theme: 'white',
      html: `<div class="head"><div class="row">${backBtn('home')}<span class="label">Session</span></div>${menuBtn}</div>
        <div class="mt-s"><span class="session-title">${esc(h.name)} <span class="ghost">· ${h.minutes} min</span></span></div>
        <div class="grow center" style="display:flex;flex-direction:column;justify-content:center">
          <div class="clock" id="clock">${fmt(goal - elapsed())}</div>
          <p class="small ghost">Goal · ${h.minutes} min</p>
          <div class="bar mt" style="width:100%"><i id="bar" style="width:${(elapsed() / goal) * 100}%"></i></div>
          <p class="tiny mt-s" id="hint"></p>
        </div>
        <button class="btn btn-outline" id="toggle"></button>`,
      mount: () => {
        const sync = () => {
          const e = elapsed();
          $('#clock').textContent = fmt(goal - e);
          $('#bar').style.width = (e / goal) * 100 + '%';
          $('#toggle').textContent = t.startedAt ? 'Pause' : e ? 'Resume' : 'Start';
          $('#hint').textContent = t.startedAt ? 'It checks off when the timer runs out.' : `Tap ${e ? 'Resume' : 'Start'} to ${e ? 'continue' : 'start'} your session`;
          if (e >= goal) finish();
        };
        const finish = async () => {
          clearTimers();
          await complete(h, Math.round(elapsed()));
          go('done/' + h.id);
        };
        on('#toggle', 'click', () => {
          if (t.startedAt) { t.elapsed = elapsed(); t.startedAt = null; } else t.startedAt = Date.now();
          store.set(key, t);
          sync();
        });
        timers.push(setInterval(sync, 500));
        sync();
      },
    };
  },

  done: id => {
    const h = S.habits.find(x => x.id == id);
    if (!h) return go('home');
    const words = h.name.toUpperCase().split(' ');
    return {
      theme: 'dark',
      bare: true,
      html: `<div class="done-wrap"><div class="done-sheet">
          <div class="head" style="justify-content:flex-end">${menuBtn}</div>
          <h1 class="h1 mt-l" style="font-size:28px"><span class="it">${esc(words.join(' '))}</span><br>complete.</h1>
          <div class="boxed mt">
            <p class="label" style="color:var(--ink);font-size:9px;font-weight:600">Goals remaining:</p>
            <div class="stack mt-s">${S.habits.map(x => `<div class="goal-line">
              <span class="ring ${isDone(x) ? 'done' : ''}">${isDone(x) ? icon.check : ''}</span>
              <span style="${isDone(x) ? 'color:#888' : ''}">${esc(habitLabel(x))}</span></div>`).join('')}</div>
          </div>
          <div class="tip mt-s">${icon.bulb}<span>${esc(S.tip)}</span></div>
        </div>
        <div class="done-foot"><button class="btn btn-outline-lime" id="next">${nextHabit() ? 'Next habit' : 'Finish the day'}</button></div></div>`,
      mount: () => on('#next', 'click', () => { const n = nextHabit(); n ? startHabit(n) : go('alldone'); }),
    };
  },

  alldone: () => {
    const n = S.habits.filter(isDone).length, all = n === S.habits.length;
    return {
      theme: 'dark',
      html: `<div class="head" style="justify-content:flex-end">${pillNav(['chart', 'gear', 'menu'])}</div>
        <div class="grow" style="max-height:120px"></div>
        <p class="small" style="font-weight:600">${S.streak} day${S.streak === 1 ? '' : 's'} of showing up</p>
        <p class="tiny lime-text" style="margin-top:4px">${all ? 'You closed every habit today. Same time tomorrow.' : 'Not finished yet. There’s still time today.'}</p>
        <div class="big-count mt-s">${n}/${S.habits.length}</div>
        <p class="label" style="color:#D0D0D0;font-weight:600;margin-top:6px">${all ? 'All habits complete' : 'Habits complete'}</p>
        <div class="stack mt">${S.habits.map((h, i) => `<div class="dark-row">
          <span class="ring ${isDone(h) ? 'done' : ''}">${isDone(h) ? icon.check : ''}</span>${esc(h.name)}
          ${i === S.habits.length - 1 ? '<button class="chip-dark" data-nav="notes">ADD NOTES</button>' : ''}</div>`).join('')}</div>
        <div class="grow"></div>
        <button class="btn btn-lime mt" data-nav="${all ? 'progress' : 'home'}">${all ? 'Insights' : 'Back to today'}</button>`,
    };
  },

  progress: async () => {
    const w = await api('/week?day=' + today());
    const fmt = (d, opts) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', opts);
    const range = `${fmt(w.start, { month: 'short', day: 'numeric' })}–${fmt(w.end, w.start.slice(5, 7) === w.end.slice(5, 7) ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}.`;
    return {
      theme: 'dark',
      html: `<div class="head"><div><p class="label" style="font-size:10px">This week</p><h1 class="h1" style="font-size:24px">${esc(range)}</h1></div>${pillNav(['chart', 'gear', 'menu'])}</div>
        <div class="panel mt-l">
          <p class="label" style="color:#D0D0D0;font-weight:600;font-size:10px;margin-bottom:18px">Total progress</p>
          ${w.habits.map(h => `<div class="meter"><div class="row between"><span>${esc(h.name)}</span><b>${h.pct}%</b></div>
            <div class="track"><i class="${h.pct < 50 ? 'low' : ''}" style="width:${h.pct}%"></i></div></div>`).join('')}
        </div>
        <div class="insight mt-s"><p>${esc(w.insight)}</p></div>
        <div class="receipt mt" id="log" hidden>
          <h4>SESSION LOG</h4><p class="sub">${esc(w.start)} → ${esc(w.end)}</p>
          ${w.sessions.length ? `<table><tr><th>DATE</th><th>HABIT</th><th class="r">TIME</th></tr>
            ${w.sessions.map(s => `<tr><td>${esc(s.day.slice(5))}</td><td>${esc(s.name)}</td><td class="r">${!s.seconds ? '✓' : s.seconds < 60 ? '<1m' : Math.round(s.seconds / 60) + 'm'}</td></tr>`).join('')}</table>`
            : '<p class="sub">No sessions yet.</p>'}
        </div>
        <div class="grow"></div>
        <button class="btn btn-lime btn-narrow mt" id="all" style="min-width:70%">View all sessions</button>`,
      mount: () => on('#all', 'click', e => {
        const log = $('#log');
        log.hidden = !log.hidden;
        e.currentTarget.textContent = log.hidden ? 'View all sessions' : 'Hide sessions';
        if (!log.hidden) log.scrollIntoView({ behavior: 'smooth' });
      }),
    };
  },
};
const timerKey = id => `striide.timer.${id}.${today()}`;

// ---------- menu ----------
function openMenu() {
  const onboarded = S.profile.onboarded;
  menuEl.innerHTML = `<div class="menu-inner">
    <div class="head"><span class="wordmark">striide</span><button class="icon-btn" data-close aria-label="Close">×</button></div>
    <nav>
      ${onboarded ? `<button data-to="home">Today</button><button data-to="notes">Notes</button><button data-to="progress">Progress</button>
      <button data-to="habits">Habits</button><button data-to="schedule">Reminders</button>` : '<button data-to="splash">Start</button>'}
      <button class="sm" data-reset>Start over</button>
    </nav></div>`;
  menuEl.hidden = false;
  menuEl.onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.reset) {
      if (!confirm('Erase all habits, notes and history?')) return;
      await api('/reset', 'POST');
      try { localStorage.clear(); } catch {}
      await refresh();
      menuEl.hidden = true;
      return go('splash');
    }
    menuEl.hidden = true;
    if (b.dataset.to) { draft.habits = null; go(b.dataset.to); }
  };
}

// ---------- router ----------
let timers = [];
function clearTimers() { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; }

const ONBOARDING = ['intro', 'splash', 'personalize', 'goals', 'habits', 'schedule', 'ready'];

async function render() {
  clearTimers();
  app.onclick = null;
  const [, name, arg] = location.hash.split('/');
  let route = screens[name] ? name : null;
  // Keep people where they belong: new users in onboarding, returning users out of the intro.
  if (!S.profile.onboarded && !ONBOARDING.includes(route)) route = 'intro';
  if (S.profile.onboarded && !route) route = 'home';
  if (S.profile.onboarded && ['intro', 'splash', 'personalize', 'ready'].includes(route)) route = 'home';
  if (S.habits.length === 0 && ['home', 'session', 'done', 'alldone', 'progress', 'notes'].includes(route)) route = 'habits';
  if (route !== name) return go(route + (arg ? '/' + arg : ''));

  try {
    const view = await screens[route](arg);
    if (!view) return;
    document.body.className = 't-' + view.theme;
    document.querySelector('meta[name=theme-color]').content = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#121212';
    app.className = view.bare ? '' : 'screen';
    app.innerHTML = view.html;
    app.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', ev => { ev.stopPropagation(); go(el.dataset.nav); }));
    app.querySelectorAll('[data-menu]').forEach(el => el.addEventListener('click', openMenu));
    view.mount?.();
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    toast(err.message);
  }
}

// ---------- reminders (only while the app is open; no push server) ----------
function checkReminders() {
  if (!S?.profile.reminders || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date().toTimeString().slice(0, 5);
  for (const [key, text] of [['morning', 'Morning check in. What are you showing up for today?'], ['evening', 'Evening log. Close out today’s habits.']]) {
    const sentKey = `striide.sent.${key}.${today()}`;
    if (S.profile[key] === now && !store.get(sentKey)) {
      new Notification('Striide', { body: text });
      store.set(sentKey, true);
    }
  }
}

// ---------- boot ----------
window.addEventListener('hashchange', render);
document.addEventListener('keydown', e => { if (e.key === 'Escape') menuEl.hidden = true; });
menuEl.addEventListener('click', e => { if (e.target.closest('[data-close]')) menuEl.hidden = true; });
document.addEventListener('visibilitychange', async () => {
  // Coming back on a new day: reload so "today" is fresh.
  if (document.visibilityState === 'visible' && S) { await refresh(); render(); }
});
setInterval(checkReminders, 30_000);

await refresh();
render();
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) location.reload(); });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
