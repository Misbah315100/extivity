/* calendar.js — view rendering and state */

const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_FULL  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EVENT_COLORS = {
  work:     '#6C63FF',
  health:   '#1D9E75',
  personal: '#D85A30',
  finance:  '#BA7517',
  travel:   '#D4537E',
  learn:    '#378ADD',
};

// Empty event store — events come from Google Calendar or manual entry
const EVENTS = {};

const _today = new Date();
let state = {
  view: 'week',
  today: _today,
  selected: new Date(_today),
  weekStart: null,
  monthRef: new Date(_today.getFullYear(), _today.getMonth(), 1),
};

function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function getWeekStart(d) {
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  return addDays(d, diff);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function renderWeekHeader() {
  const ws = getWeekStart(state.selected);
  state.weekStart = ws;
  const strip = document.getElementById('day-strip');
  strip.innerHTML = '';

  // render 5 weeks centred on current week (-2 to +2)
  for (let w = -2; w <= 2; w++) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(ws, w * 7 + i);
      const key = dateKey(day);
      const isToday = isSameDay(day, state.today);
      const isSelected = isSameDay(day, state.selected);
      const hasEvents = (EVENTS[key] || []).length > 0;

      const col = document.createElement('div');
      col.className = 'week-day-col';
      col.dataset.key = key;
      col.onclick = () => selectDay(day);

      col.innerHTML = `
        <span class="wday-name">${DAYS_SHORT[i]}</span>
        <span class="wday-num${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}">${day.getDate()}</span>
        <span class="wday-dot${hasEvents ? ' has-events' : ''}"></span>
      `;
      strip.appendChild(col);
    }
  }

  // scroll strip so selected week is centred
  setTimeout(() => {
    const selectedCol = strip.querySelector('.wday-num.today, .wday-num.selected');
    if (selectedCol) {
      const col = selectedCol.closest('.week-day-col');
      const stripRect = strip.getBoundingClientRect();
      const colRect = col.getBoundingClientRect();
      strip.scrollLeft += colRect.left - stripRect.left - (stripRect.width / 2) + (colRect.width / 2);
    }
  }, 10);

  // update month label
  const monthLabel = document.getElementById('month-label');
  if (monthLabel) monthLabel.textContent = MONTHS[state.selected.getMonth()] + ' ' + state.selected.getFullYear();
}

function renderSchedule() {
  const container = document.getElementById('schedule-list');
  container.innerHTML = '';
  const ws = getWeekStart(state.selected);

  for (let i = 0; i < 7; i++) {
    const day = addDays(ws, i);
    const key = dateKey(day);
    const events = (EVENTS[key] || []).sort((a, b) => a.time.localeCompare(b.time));
    const isToday = isSameDay(day, state.today);
    const dayOfWeek = (day.getDay() + 6) % 7; // convert Sun=0 to Mon=0

    const label = document.createElement('div');
    label.className = 'schedule-day-label';
    label.id = 'day-label-' + key;
    label.textContent = isToday
      ? `Today · ${DAYS_FULL[dayOfWeek]} ${day.getDate()}`
      : `${DAYS_FULL[dayOfWeek]} ${day.getDate()}`;
    container.appendChild(label);

    if (events.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-events';
      empty.textContent = '+ Add event';
      empty.style.cursor = 'pointer';
      empty.onclick = () => { if (window.eventsAPI) window.eventsAPI.openAddSheet(key); };
      container.appendChild(empty);
    } else {
      events.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.setProperty('--event-color', EVENT_COLORS[ev.cat] || EVENT_COLORS.work);
        card.innerHTML = `
          <span class="event-time">${ev.time}</span>
          <div class="event-body">
            <div class="event-title">${ev.title}</div>
            <div class="event-subtitle">${ev.cal}</div>
          </div>
          <span class="event-tag">${ev.cat}</span>
        `;
        card.onclick = () => {
          if (window.eventsAPI) window.eventsAPI.openEditSheet(ev, key);
          else window.askAI(`Tell me about my "${ev.title}" event on ${DAYS_FULL[dayOfWeek]}`);
        };
        container.appendChild(card);
      });
    }
  }

  // scroll handled by selectDay
}

function renderMonthView() {
  const mr = state.monthRef;
  document.getElementById('month-nav-title').textContent = `${MONTHS[mr.getMonth()]} ${mr.getFullYear()}`;

  const grid = document.getElementById('month-grid');
  grid.innerHTML = '';

  const firstDay = new Date(mr.getFullYear(), mr.getMonth(), 1).getDay();
  const offset = (firstDay === 0) ? 6 : firstDay - 1;
  const daysInMonth = new Date(mr.getFullYear(), mr.getMonth() + 1, 0).getDate();
  const daysInPrev  = new Date(mr.getFullYear(), mr.getMonth(), 0).getDate();

  let cells = [];
  for (let i = offset - 1; i >= 0; i--) cells.push({ d: daysInPrev - i, m: mr.getMonth() - 1, y: mr.getFullYear(), other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, m: mr.getMonth(), y: mr.getFullYear(), other: false });
  while (cells.length < 42) {
    cells.push({ d: cells.length - daysInMonth - offset + 1, m: mr.getMonth() + 1, y: mr.getFullYear(), other: true });
  }

  cells.forEach(c => {
    const date = new Date(c.y, c.m, c.d);
    const key = dateKey(date);
    const isToday = isSameDay(date, state.today);
    const isSelected = isSameDay(date, state.selected);
    const events = EVENTS[key] || [];

    const cell = document.createElement('div');
    cell.className = 'month-cell';
    cell.onclick = () => { selectDay(date); setView('week'); };

    const numClass = ['month-cell-num', isToday ? 'today' : '', isSelected && !isToday ? 'selected' : '', c.other ? 'other' : ''].filter(Boolean).join(' ');
    cell.innerHTML = `<span class="${numClass}">${c.d}</span>`;

    if (events.length > 0) {
      const evDiv = document.createElement('div');
      evDiv.className = 'month-cell-events';
      events.slice(0, 3).forEach(ev => {
        const dot = document.createElement('div');
        dot.className = 'month-event-dot';
        dot.style.background = EVENT_COLORS[ev.cat] || EVENT_COLORS.work;
        evDiv.appendChild(dot);
      });
      cell.appendChild(evDiv);
    }
    grid.appendChild(cell);
  });
}

function selectDay(date) {
  state.selected = date;
  if (state.view === 'week') {
    renderWeekHeader();
    renderSchedule();
    setTimeout(() => {
      const key = dateKey(date);
      const target = document.getElementById('day-label-' + key);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  } else if (state.view === 'grid') {
    renderGridView();
  } else {
    renderMonthView();
  }
}

function setView(v) {
  state.view = v;
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
  document.getElementById('week-view').classList.toggle('hidden', v !== 'week');
  document.getElementById('month-view').classList.toggle('hidden', v !== 'month');
  if (v === 'week') {
    renderWeekHeader();
    renderSchedule();
    setTimeout(() => {
      const key = dateKey(state.selected);
      const target = document.getElementById('day-label-' + key);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  } else if (v === 'month') {
    state.monthRef = new Date(state.selected.getFullYear(), state.selected.getMonth(), 1);
    renderMonthView();
  }
}

function changeMonth(dir) {
  state.monthRef = new Date(state.monthRef.getFullYear(), state.monthRef.getMonth() + dir, 1);
  renderMonthView();
}

function getWeekContext() {
  const ws = getWeekStart(state.selected);
  let ctx = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(ws, i);
    const key = dateKey(day);
    const evs = EVENTS[key] || [];
    if (evs.length > 0) {
      ctx.push(`${DAYS_FULL[i]} ${day.getDate()}: ${evs.map(e => `${e.title} at ${e.time}`).join(', ')}`);
    } else {
      ctx.push(`${DAYS_FULL[i]} ${day.getDate()}: free`);
    }
  }
  return ctx.join('\n');
}

window.calendarAPI = { getWeekContext, selectDay, setView, changeMonth, dateKey, state, EVENTS };

/* ── GRID VIEW ─────────────────────────── */

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function renderGridView() {
  const ws = getWeekStart(state.selected);
  const container = document.getElementById('grid-body');
  const headerCols = document.getElementById('grid-header-cols');

  // header
  headerCols.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const day = addDays(ws, i);
    const isToday = isSameDay(day, state.today);
    const isSelected = isSameDay(day, state.selected);
    const col = document.createElement('div');
    col.className = 'grid-col-head';
    col.innerHTML = `
      <span class="wday-name">${DAYS_SHORT[i]}</span>
      <span class="wday-num${isToday ? ' today' : ''}${isSelected && !isToday ? ' selected' : ''}">${day.getDate()}</span>
    `;
    col.onclick = () => selectDay(day);
    headerCols.appendChild(col);
  }

  // body
  container.innerHTML = '';

  // time labels column
  const timeCol = document.createElement('div');
  timeCol.className = 'grid-time-col';
  for (let h = 0; h < 24; h++) {
    const label = document.createElement('div');
    label.className = 'grid-hour-label';
    label.textContent = h === 0 ? '' : `${String(h).padStart(2,'0')}:00`;
    timeCol.appendChild(label);
  }
  container.appendChild(timeCol);

  // day columns
  for (let i = 0; i < 7; i++) {
    const day = addDays(ws, i);
    const key = dateKey(day);
    const isToday = isSameDay(day, state.today);
    const events = EVENTS[key] || [];

    const col = document.createElement('div');
    col.className = 'grid-day-col' + (isToday ? ' today-col' : '');
    col.style.height = '1152px'; // 24 * 48px

    events.forEach(ev => {
      const mins = timeToMinutes(ev.time);
      const topPx = (mins / 60) * 48;
      const heightPx = 44; // default 44px (~55min visual)

      const block = document.createElement('div');
      block.className = 'grid-event';
      block.style.top = topPx + 'px';
      block.style.height = heightPx + 'px';
      block.style.background = EVENT_COLORS[ev.cat] || EVENT_COLORS.work;
      block.innerHTML = `
        <div class="grid-event-title">${ev.title}</div>
        <div class="grid-event-time">${ev.time}</div>
      `;
      block.onclick = () => window.askAI(`Tell me about "${ev.title}" on ${DAYS_FULL[i]}`);
      col.appendChild(block);
    });

    // current time indicator (today only)
    if (isToday) {
      const now = new Date(2026, 5, 24, 14, 14); // demo: 14:14
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const indicator = document.createElement('div');
      indicator.className = 'time-indicator';
      indicator.style.top = ((nowMins / 60) * 48) + 'px';
      col.appendChild(indicator);
    }

    container.appendChild(col);
  }

  // scroll to 8am on render
  setTimeout(() => {
    const scroll = document.getElementById('grid-scroll');
    if (scroll) scroll.scrollTop = 8 * 48;
  }, 50);
}

// patch setView to handle grid
const _origSetView = setView;
window.calendarAPI_setView_patched = true;

function setViewAll(v) {
  state.view = v;
  document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === v));
  document.getElementById('week-view').classList.toggle('hidden', v !== 'week');
  document.getElementById('month-view').classList.toggle('hidden', v !== 'month');
  document.getElementById('grid-view').classList.toggle('hidden', v !== 'grid');
  if (v === 'week') { renderWeekHeader(); renderSchedule(); }
  else if (v === 'month') { state.monthRef = new Date(state.selected.getFullYear(), state.selected.getMonth(), 1); renderMonthView(); }
  else if (v === 'grid') { renderGridView(); }
}

window.calendarAPI.setView = setViewAll;
window.calendarAPI.renderGridView = renderGridView;
