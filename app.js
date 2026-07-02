/* app.js */

function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.warn);
  }

  // view tabs
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => window.calendarAPI.setView(tab.dataset.view));
  });

  // month nav
  document.getElementById('month-prev').addEventListener('click', () => window.calendarAPI.changeMonth(-1));
  document.getElementById('month-next').addEventListener('click', () => window.calendarAPI.changeMonth(1));

  // ai input
  const aiInput = document.getElementById('ai-input');
  const sendBtn = document.getElementById('send-btn');
  aiInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(); }
  });
  aiInput.addEventListener('input', () => {
    aiInput.style.height = 'auto';
    aiInput.style.height = Math.min(aiInput.scrollHeight, 80) + 'px';
  });
  sendBtn.addEventListener('click', () => askAI());

  // quick chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => askAI(chip.dataset.prompt));
  });

  // sheet closes
  document.getElementById('sheet-close').addEventListener('click', closeSheet);

  // sheet reply input
  const sheetReplyInput = document.getElementById('sheet-reply-input');
  const sheetReplyBtn = document.getElementById('sheet-reply-btn');
  sheetReplyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); askAI(); }
  });
  sheetReplyBtn.addEventListener('click', () => askAI());
  document.getElementById('overlay').addEventListener('click', () => {
    closeSheet();
    if (typeof closeGcalSheet === 'function') closeGcalSheet();
    if (typeof closeEventSheet === 'function') closeEventSheet();
  });

  // swipe AI sheet down to close
  let sheetTouchY = 0;
  const aiSheet = document.getElementById('ai-sheet');
  aiSheet.addEventListener('touchstart', e => { sheetTouchY = e.touches[0].clientY; }, { passive: true });
  aiSheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - sheetTouchY > 60) closeSheet();
  }, { passive: true });

  // gcal buttons
  document.getElementById('gcal-btn').addEventListener('click', () => {
    if (typeof openGcalSheet === 'function') openGcalSheet();
  });
  document.getElementById('gcal-sheet-close').addEventListener('click', () => {
    if (typeof closeGcalSheet === 'function') closeGcalSheet();
  });
  document.getElementById('gcal-connect-btn').addEventListener('click', () => {
    if (typeof connectGoogleCalendar === 'function') connectGoogleCalendar();
  });

  // ── WEEK SWIPE ──────────────────────────────────────────
  // Attach to schedule-scroll so we catch touches on the list itself.
  // We track direction early: if horizontal wins, we hijack and prevent scroll.
  let sx = 0, sy = 0, decided = false, isHoriz = false;

  const schedScroll = document.getElementById('schedule-scroll');

  schedScroll.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    decided = false;
    isHoriz = false;
  }, { passive: true });

  schedScroll.addEventListener('touchmove', e => {
    if (decided) {
      // if horizontal, block default scroll
      if (isHoriz) e.preventDefault();
      return;
    }
    const dx = Math.abs(e.touches[0].clientX - sx);
    const dy = Math.abs(e.touches[0].clientY - sy);
    if (dx > 8 || dy > 8) {
      decided = true;
      isHoriz = dx > dy * 1.2;
      if (isHoriz) e.preventDefault();
    }
  }, { passive: false }); // NOT passive so we can preventDefault

  schedScroll.addEventListener('touchend', e => {
    if (!isHoriz) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) {
      // snap to full week boundary
      const current = window.calendarAPI.state.selected;
      const ws = getWeekStart(current);
      const target = addDays(ws, dx < 0 ? 7 : -7);
      schedScroll.style.opacity = '0.3';
      window.calendarAPI.selectDay(target);
      setTimeout(() => { schedScroll.style.opacity = ''; }, 180);
    }
  }, { passive: true });

  // helper fns used above (mirrored from calendar.js)
  function getWeekStart(d) {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const r = new Date(d);
    r.setDate(r.getDate() + diff);
    return r;
  }
  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  // ── GRID VIEW SWIPE (same logic as schedule) ───────────
  let gx = 0, gy = 0, gDecided = false, gHoriz = false;
  const gridScroll = document.getElementById('grid-scroll');

  gridScroll.addEventListener('touchstart', e => {
    gx = e.touches[0].clientX;
    gy = e.touches[0].clientY;
    gDecided = false; gHoriz = false;
  }, { passive: true });

  gridScroll.addEventListener('touchmove', e => {
    if (gDecided) { if (gHoriz) e.preventDefault(); return; }
    const dx = Math.abs(e.touches[0].clientX - gx);
    const dy = Math.abs(e.touches[0].clientY - gy);
    if (dx > 8 || dy > 8) {
      gDecided = true;
      gHoriz = dx > dy * 1.2;
      if (gHoriz) e.preventDefault();
    }
  }, { passive: false });

  gridScroll.addEventListener('touchend', e => {
    if (!gHoriz) return;
    const dx = e.changedTouches[0].clientX - gx;
    if (Math.abs(dx) > 40) {
      const ws = getWeekStart(window.calendarAPI.state.selected);
      const target = addDays(ws, dx < 0 ? 7 : -7);
      window.calendarAPI.selectDay(target);
    }
  }, { passive: true });

  // initial render
  window.calendarAPI.setView('week');

  // topbar date
  const today = new Date();
  document.getElementById('topbar-date').textContent = today.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

document.addEventListener('DOMContentLoaded', init);
