/* gcal.js — Google Calendar integration */

const GCAL_CLIENT_ID = '133401554601-loc36isu3mohrsvnd28vs39nqn9psfab.apps.googleusercontent.com';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let gcalConnected = false;

// Load GAPI
function gapiLoaded() {
  gapi.load('client', initGapiClient);
}

async function initGapiClient() {
  await gapi.client.init({});
  await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest');
  gapiInited = true;
  maybeEnableConnect();
}

// Load GIS
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GCAL_CLIENT_ID,
    scope: GCAL_SCOPE,
    callback: handleTokenResponse,
  });
  gisInited = true;
  maybeEnableConnect();
}

function maybeEnableConnect() {
  const btn = document.getElementById('gcal-connect-btn');
  if (btn && gapiInited && gisInited) {
    btn.disabled = false;
    const hint = btn.nextElementSibling;
    if (hint) hint.textContent = 'Your events will load automatically after connecting.';
  }
}

function handleTokenResponse(resp) {
  if (resp.error) {
    console.error('OAuth error:', resp.error);
    return;
  }
  gcalConnected = true;
  window.gcalConnected = true;
  sessionStorage.setItem('gcal_connected', '1');
  updateGcalBtn(true);
  closeGcalSheet();
  fetchAndMergeEvents();
}

function connectGoogleCalendar() {
  if (!gapiInited || !gisInited) {
    alert('Still loading Google libraries, try again in a moment.');
    return;
  }
  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

async function fetchAndMergeEvents() {
  if (!gcalConnected) return;
  try {
    const now = new Date();
    const twoMonths = new Date();
    twoMonths.setMonth(twoMonths.getMonth() + 2);

    const res = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: twoMonths.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const items = res.result.items || [];
    items.forEach(ev => {
      if (!ev.start) return;
      const isAllDay = !!ev.start.date;
      const start = new Date(ev.start.dateTime || ev.start.date);
      const key = fmtKey(start);
      const time = isAllDay ? 'All day' : `${pad(start.getHours())}:${pad(start.getMinutes())}`;

      if (!window.calendarAPI.EVENTS[key]) window.calendarAPI.EVENTS[key] = [];
      if (!window.calendarAPI.EVENTS[key].find(e => e.gcalId === ev.id)) {
        window.calendarAPI.EVENTS[key].push({
          id: ev.id, gcalId: ev.id,
          title: ev.summary || '(No title)',
          time, cat: 'work',
          cal: 'Google Calendar',
          gcal: true,
        });
      }
    });

    window.calendarAPI.setView(window.calendarAPI.state.view);
  } catch(e) {
    console.error('Fetch events error:', e);
  }
}

async function addCalendarEvent(title, dateStr, timeStr = '09:00', durationMins = 60) {
  if (!gcalConnected) { openGcalSheet(); return false; }
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min);
    const end = new Date(start.getTime() + durationMins * 60000);

    await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: title,
        start: { dateTime: start.toISOString(), timeZone: 'Europe/London' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/London' },
      },
    });

    // add locally too for immediate feedback
    if (!window.calendarAPI.EVENTS[dateStr]) window.calendarAPI.EVENTS[dateStr] = [];
    window.calendarAPI.EVENTS[dateStr].push({ id: Date.now(), title, time: timeStr, cat: 'travel', cal: 'Google Calendar', gcal: true });
    window.calendarAPI.setView(window.calendarAPI.state.view);
    return true;
  } catch(e) {
    console.error('Add event error:', e);
    return false;
  }
}

async function addDateRangeBlock(title, startDateStr, endDateStr) {
  if (!gcalConnected) { openGcalSheet(); return false; }
  try {
    await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: title,
        start: { date: startDateStr },
        end: { date: endDateStr },
      },
    });

    // add locally across date range
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = fmtKey(d);
      if (!window.calendarAPI.EVENTS[key]) window.calendarAPI.EVENTS[key] = [];
      window.calendarAPI.EVENTS[key].push({ id: Date.now() + d.getTime(), title, time: 'All day', cat: 'travel', cal: 'Google Calendar', gcal: true });
    }
    window.calendarAPI.setView(window.calendarAPI.state.view);
    return true;
  } catch(e) {
    console.error('Add range error:', e);
    return false;
  }
}

function fmtKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2,'0'); }

function updateGcalBtn(connected) {
  const lbl = document.getElementById("gcal-btn-label");
  const btn = document.getElementById('gcal-btn');
  if (!btn) return;
  if (connected) {
    btn.innerHTML = '<i class="ti ti-calendar-check" aria-hidden="true"></i>';
    btn.style.color = '#1D9E75';
    btn.classList.add("connected");
    if (lbl) lbl.textContent = "Synced";
    btn.title = 'Google Calendar connected';
  }
}

function openGcalSheet() {
  closeSheet();
  document.getElementById('gcal-sheet').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
}

function closeGcalSheet() {
  document.getElementById('gcal-sheet').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}

document.addEventListener('DOMContentLoaded', () => {
  // inject google scripts
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.onload = gapiLoaded;
  document.head.appendChild(gapiScript);

  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.onload = gisLoaded;
  document.head.appendChild(gisScript);

  document.getElementById('gcal-connect-btn').disabled = true;
});

window.gcalAPI = { addCalendarEvent, addDateRangeBlock, fetchAndMergeEvents, isConnected: () => gcalConnected };

async function updateCalendarEvent(gcalId, title, dateStr, timeStr, durationMins) {
  if (!gcalConnected) return false;
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min);
    const end = new Date(start.getTime() + durationMins * 60000);
    await gapi.client.calendar.events.update({
      calendarId: 'primary',
      eventId: gcalId,
      resource: {
        summary: title,
        start: { dateTime: start.toISOString(), timeZone: 'Europe/London' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/London' },
      },
    });
    return true;
  } catch(e) { console.error('Update error:', e); return false; }
}

async function deleteCalendarEvent(gcalId) {
  if (!gcalConnected) return false;
  try {
    await gapi.client.calendar.events.delete({ calendarId: 'primary', eventId: gcalId });
    return true;
  } catch(e) { console.error('Delete error:', e); return false; }
}

// expose on gcalAPI
window.gcalAPI = { addCalendarEvent, addDateRangeBlock, updateCalendarEvent, deleteCalendarEvent, fetchAndMergeEvents, isConnected: () => gcalConnected };
