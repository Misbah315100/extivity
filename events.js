/* events.js — add / edit / delete / duplicate */

let editingEventId = null;
let selectedCat = 'work';

function pad(n) { return String(n).padStart(2, '0'); }
function todayStr() {
  const d = new Date(2026, 5, 24);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function selectedDateStr() {
  return window.calendarAPI.dateKey(window.calendarAPI.state.selected);
}

function openAddSheet(dateStr) {
  editingEventId = null;
  selectedCat = 'work';
  const d = dateStr || selectedDateStr();

  setFormLabel('New event', 'ti-calendar-event');
  document.getElementById('form-title').value = '';
  document.getElementById('form-date-from').value = d;
  document.getElementById('form-date-to').value = '';
  document.getElementById('form-time').value = '09:00';
  document.getElementById('form-duration').value = '60';
  document.getElementById('edit-event-id').value = '';
  document.getElementById('edit-event-gcal-id').value = '';
  document.getElementById('form-delete-btn').classList.add('hidden');
  document.getElementById('form-duplicate-btn').classList.add('hidden');
  resetCatPills('work');
  openEventSheet();
}

function openEditSheet(ev, dateStr) {
  editingEventId = ev.id;
  selectedCat = ev.cat || 'work';

  setFormLabel('Edit event', 'ti-edit');
  document.getElementById('form-title').value = ev.title;
  document.getElementById('form-date-from').value = dateStr;
  document.getElementById('form-date-to').value = ev.dateTo || '';
  document.getElementById('form-time').value = ev.time || '09:00';
  document.getElementById('form-duration').value = ev.duration || '60';
  document.getElementById('edit-event-id').value = ev.id;
  document.getElementById('edit-event-gcal-id').value = ev.gcalId || '';
  document.getElementById('form-delete-btn').classList.remove('hidden');
  document.getElementById('form-duplicate-btn').classList.remove('hidden');
  resetCatPills(selectedCat);
  openEventSheet();
}

function setFormLabel(text, icon) {
  document.getElementById('event-sheet-label').innerHTML = `<i class="ti ${icon}"></i> ${text}`;
}

function resetCatPills(cat) {
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
  selectedCat = cat;
}

function openEventSheet() {
  document.getElementById('event-sheet').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
  setTimeout(() => document.getElementById('form-title').focus(), 300);
}

function closeEventSheet() {
  document.getElementById('event-sheet').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}

function getFormData() {
  return {
    title:    document.getElementById('form-title').value.trim(),
    dateFrom: document.getElementById('form-date-from').value,
    dateTo:   document.getElementById('form-date-to').value,
    time:     document.getElementById('form-time').value || '09:00',
    duration: parseInt(document.getElementById('form-duration').value) || 60,
    gcalId:   document.getElementById('edit-event-gcal-id').value,
    cat:      selectedCat,
  };
}

function writeToLocalCalendar(ev, dateFrom, dateTo) {
  const EVENTS = window.calendarAPI.EVENTS;
  const start = new Date(dateFrom);
  const end   = dateTo ? new Date(dateTo) : new Date(dateFrom);

  // write across date range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (!EVENTS[key]) EVENTS[key] = [];
    EVENTS[key].push({ ...ev, id: ev.id + d.getTime() });
  }
}

function removeFromLocalCalendar(id) {
  const EVENTS = window.calendarAPI.EVENTS;
  for (const key of Object.keys(EVENTS)) {
    const idx = EVENTS[key].findIndex(e => String(e.id).startsWith(String(id)));
    if (idx !== -1) EVENTS[key].splice(idx, 1);
  }
}

async function saveEvent() {
  const f = getFormData();
  if (!f.title) {
    const inp = document.getElementById('form-title');
    inp.focus(); inp.style.borderColor = '#D85A30';
    return;
  }
  document.getElementById('form-title').style.borderColor = '';

  // remove old version if editing
  if (editingEventId) removeFromLocalCalendar(editingEventId);

  const newEv = {
    id: editingEventId || Date.now(),
    title: f.title, time: f.time,
    cat: f.cat, duration: f.duration,
    dateTo: f.dateTo || null,
    cal: window.gcalAPI?.isConnected() ? 'Google Calendar' : 'CalAI',
  };

  // write to local calendar
  writeToLocalCalendar(newEv, f.dateFrom, f.dateTo);

  // write to Google Calendar
  if (window.gcalAPI?.isConnected()) {
    try {
      if (f.dateTo) {
        await window.gcalAPI.addDateRangeBlock(f.title, f.dateFrom, f.dateTo);
      } else if (f.gcalId && editingEventId) {
        await window.gcalAPI.updateCalendarEvent(f.gcalId, f.title, f.dateFrom, f.time, f.duration);
      } else {
        await window.gcalAPI.addCalendarEvent(f.title, f.dateFrom, f.time, f.duration);
      }
    } catch(e) { console.error('GCal save error:', e); }
  }

  closeEventSheet();
  window.calendarAPI.selectDay(window.calendarAPI.state.selected);
}

async function deleteEvent() {
  if (!editingEventId) return;
  const gcalId = document.getElementById('edit-event-gcal-id').value;
  removeFromLocalCalendar(editingEventId);
  if (gcalId && window.gcalAPI?.isConnected()) {
    try { await window.gcalAPI.deleteCalendarEvent(gcalId); } catch(e) { console.error(e); }
  }
  closeEventSheet();
  window.calendarAPI.selectDay(window.calendarAPI.state.selected);
}

function duplicateEvent() {
  const f = getFormData();
  if (!f.title) return;
  closeEventSheet();
  // open add sheet pre-filled with same data but no id
  editingEventId = null;
  setFormLabel('Duplicate event', 'ti-copy');
  document.getElementById('form-title').value = f.title + ' (copy)';
  document.getElementById('form-date-from').value = f.dateFrom;
  document.getElementById('form-date-to').value = f.dateTo;
  document.getElementById('form-time').value = f.time;
  document.getElementById('form-duration').value = f.duration;
  document.getElementById('edit-event-id').value = '';
  document.getElementById('edit-event-gcal-id').value = '';
  document.getElementById('form-delete-btn').classList.add('hidden');
  document.getElementById('form-duplicate-btn').classList.add('hidden');
  resetCatPills(f.cat);
  openEventSheet();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fab').addEventListener('click', () => openAddSheet());
  document.getElementById('event-sheet-close').addEventListener('click', closeEventSheet);
  document.querySelectorAll('.cat-pill').forEach(p => p.addEventListener('click', () => resetCatPills(p.dataset.cat)));
  document.getElementById('form-save-btn').addEventListener('click', saveEvent);
  document.getElementById('form-delete-btn').addEventListener('click', () => {
    if (confirm('Delete this event?')) deleteEvent();
  });
  document.getElementById('form-duplicate-btn').addEventListener('click', duplicateEvent);
});

window.eventsAPI = { openAddSheet, openEditSheet, closeEventSheet };
