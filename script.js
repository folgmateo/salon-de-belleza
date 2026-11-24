(() => {
  // ---- Configuración ----
  const CONFIG = {
    telefono: '+502 5487 0255',
    horas: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'],
    cerradoDomingo: true,
    // URL de la app web de Google Apps Script (ver backend/LEEME.md). Vacío = modo local (solo este navegador).
    backend: ''
  };

  // Fotos sin fondo en img/*.webp
  const SERVICES = [
    { t: 'Corte y estilo', img: 'img/tijeras.webp',
      d: 'Cortes a medida y asesoría de forma: el corte que realza tu rostro y se adapta a tu día a día.' },
    { t: 'Secado y peinado', img: 'img/secador.webp',
      d: 'Secado con acabado profesional, brillo y volumen para que tu peinado dure todo el día.' },
    { t: 'Maquillaje', img: 'img/labial.webp',
      d: 'Maquillaje social, para bodas, eventos y sesiones fotográficas, con acabados que duran toda la jornada.' },
    { t: 'Manicura y pedicura', img: 'img/esmalte.webp',
      d: 'Uñas impecables, diseño de nail art y tratamientos de hidratación para manos y pies.' },
    { t: 'Tratamientos faciales', img: 'img/crema.webp',
      d: 'Limpieza profunda, hidratación y terapias para una piel luminosa y equilibrada.' },
    { t: 'Peinados para ocasiones', img: 'img/cepillo.webp',
      d: 'Peinados de novia, quinceañeras y eventos especiales, listos para lucir toda la noche.' }
  ];

  const $ = s => document.querySelector(s);
  const stage = $('#stage'), box = $('#box'), itemsEl = $('#items');
  const capEl = $('#caption'), bar = $('#bar');
  const N = SERVICES.length;
  // Cada objeto ocupa una ventana W del scroll: entra girando, se detiene a mostrar info y se aleja.
  const START = 0.03, END_PAD = 0.08, W = (1 - START - END_PAD) / N;
  const OFFSET_X = [-0.14, 0.12, -0.1, 0.15, -0.12, 0.1]; // posición lateral para que no se encimen
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [];
  let R = 300, S = 240, I = 260, curIdx = -1;

  // ---- Construir objetos (fotos) ----
  SERVICES.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<img src="${s.img}" alt="${s.t}" draggable="false" onerror="this.style.display='none'">`;
    itemsEl.appendChild(el);
    items.push(el);
  });

  // ---- Tamaños responsivos ----
  function layout() {
    const w = innerWidth;
    S = Math.round(Math.min(230, Math.max(160, w * 0.34)));
    I = Math.round(Math.min(340, Math.max(200, w * 0.42)));
    R = Math.round(Math.min(w * 0.4, 420));
    const root = document.documentElement.style;
    root.setProperty('--S', S + 'px');
    root.setProperty('--I', I + 'px');
  }

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIn = t => t * t * t;

  // ---- Render según progreso del scroll (0..1) ----
  function render(p) {
    box.style.transform = `rotateX(-16deg) rotateY(${p * 360}deg)`;
    box.style.opacity = String(1 - 0.75 * clamp((p - 0.02) / 0.1));

    items.forEach((el, i) => {
      const u = (p - (START + i * W)) / W;   // 0..1 dentro de su ventana
      if (u <= 0 || u >= 1) {
        el.style.opacity = 0;
        el.style.transform = 'translate3d(0,0,-1600px) scale(0.3)';
        return;
      }
      const x = OFFSET_X[i % OFFSET_X.length] * innerWidth;
      let z, rotY, rotX = 0, scale, op;
      if (u < 0.38) {                     // entra desde el fondo, girando 360°
        const a = easeOut(u / 0.38);
        z = -1600 + 1660 * a; rotY = 360 * a; scale = 0.3 + 0.7 * a; op = Math.min(1, u / 0.12);
        rotX = -20 * (1 - a);
      } else if (u < 0.72) {              // se queda al frente mostrando la información
        const f = (u - 0.38) / 0.34;
        z = 60 + Math.sin(f * Math.PI) * 25; rotY = Math.sin(f * Math.PI * 2) * 6; scale = 1; op = 1;
      } else {                            // se aleja hacia atrás y desaparece
        const b = easeIn((u - 0.72) / 0.28);
        z = 60 - 1660 * b; rotY = 360 * b * 0.5; scale = 1 - 0.7 * b; op = 1 - b;
        rotX = 14 * b;
      }
      el.style.opacity = op;
      el.style.transform = `translate3d(${x}px,0,${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
    });

    const idx = clamp(Math.floor((p - START) / W), 0, N - 1);
    if (p < START) {
      if (curIdx !== -1) { curIdx = -1; setCaption(null); }
    } else if (idx !== curIdx) {
      curIdx = idx; setCaption(idx);
    }
    bar.style.transform = `scaleX(${p})`;
  }

  function setCaption(idx) {
    const num = capEl.querySelector('.num'), h = capEl.querySelector('h2'), p = capEl.querySelector('p');
    if (idx === null) {
      num.textContent = ''; h.textContent = ''; p.textContent = 'Desliza para descubrir lo que hacemos.';
      return;
    }
    num.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    h.textContent = SERVICES[idx].t;
    p.textContent = SERVICES[idx].d;
  }

  // ---- Scroll ----
  function update() {
    const r = stage.getBoundingClientRect();
    const range = Math.max(1, stage.offsetHeight - innerHeight);
    render(reduce ? 1 : clamp(-r.top / range));
  }
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { layout(); update(); });

  if (reduce) stage.parentElement.classList.add('reduce');
  layout(); update();

  // ---- Agenda ----
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const state = { cur: new Date(today.getFullYear(), today.getMonth(), 1), fecha: null, hora: null, ocupadas: [] };
  const grid = $('#grid'), slotsEl = $('#slots'), monthEl = $('#month'), form = $('#form'), msg = $('#msg'), ok = $('#ok');
  const cancelForm = $('#cancel-form'), cancelMsg = $('#cancel-msg');
  const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtFecha = key => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  // Modo local: citas guardadas en este navegador (cuando no hay backend)
  const localCitas = () => { try { return JSON.parse(localStorage.getItem('citas') || '[]'); } catch { return []; } };

  async function cargarOcupadas(fecha) {
    if (!CONFIG.backend) {
      state.ocupadas = localCitas().filter(c => c.fecha === fecha && c.estado !== 'cancelada').map(c => c.hora);
      return;
    }
    try {
      const r = await fetch(`${CONFIG.backend}?fecha=${encodeURIComponent(fecha)}`);
      const j = await r.json();
      state.ocupadas = j.ocupadas || [];
    } catch { state.ocupadas = []; }
  }

  function renderCal() {
    const y = state.cur.getFullYear(), m = state.cur.getMonth();
    monthEl.textContent = state.cur.toLocaleDateString('es', { month: 'long', year: 'numeric' });
    grid.innerHTML = DOW.map(d => `<span class="dow">${d}</span>`).join('');
    for (let k = 0; k < new Date(y, m, 1).getDay(); k++) grid.insertAdjacentHTML('beforeend', '<span></span>');
    const days = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d), key = iso(date);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'day' + (key === state.fecha ? ' sel' : '') + (key === iso(today) ? ' hoy' : '');
      b.textContent = d;
      b.disabled = date < today || (CONFIG.cerradoDomingo && date.getDay() === 0);
      b.addEventListener('click', async () => {
        state.fecha = key; state.hora = null;
        renderCal();
        slotsEl.innerHTML = '<p class="hint">Cargando horarios…</p>';
        await cargarOcupadas(key);
        renderSlots();
      });
      grid.appendChild(b);
    }
  }

  function renderSlots() {
    slotsEl.innerHTML = '';
    if (!state.fecha) { slotsEl.innerHTML = '<p class="hint">Elige un día para ver los horarios.</p>'; return; }
    const now = new Date();
    CONFIG.horas.forEach(h => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot' + (state.hora === h ? ' sel' : '');
      b.textContent = h;
      b.disabled = state.ocupadas.includes(h) || new Date(`${state.fecha}T${h}:00`) < now;
      b.addEventListener('click', () => { state.hora = h; renderSlots(); });
      slotsEl.appendChild(b);
    });
  }

  $('#prev').addEventListener('click', () => { state.cur = new Date(state.cur.getFullYear(), state.cur.getMonth() - 1, 1); renderCal(); });
  $('#next').addEventListener('click', () => { state.cur = new Date(state.cur.getFullYear(), state.cur.getMonth() + 1, 1); renderCal(); });

  // Archivo .ics: el calendario del cliente le avisa 1 día antes y 1 hora antes
  function icsFor(c) {
    const [y, m, d] = c.fecha.split('-');
    const hh = c.hora.slice(0, 2);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Salon de Belleza//ES', 'BEGIN:VEVENT',
      `UID:${Date.now()}@salon-de-belleza`, `DTSTAMP:${stamp}`,
      `DTSTART:${y}${m}${d}T${hh}0000`, `DTEND:${y}${m}${d}T${pad(+hh + 1)}0000`,
      `SUMMARY:Cita - Salón de Belleza (${c.servicio})`, `DESCRIPTION:Tel. ${CONFIG.telefono} · Código ${c.codigo || ''}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Mañana tienes tu cita', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Tu cita es en una hora', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  function showOk(c) {
    ok.hidden = false;
    ok.replaceChildren();
    const h = document.createElement('h3'); h.textContent = '¡Cita agendada!';
    const p1 = document.createElement('p'); p1.textContent = `${fmtFecha(c.fecha)} a las ${c.hora} · ${c.servicio}`;
    const p2 = document.createElement('p'); p2.textContent = `Código de cita: ${c.codigo}. Lo necesitas para cancelar.`;
    const p3 = document.createElement('p');
    p3.textContent = CONFIG.backend ? `Te enviamos la confirmación y el recordatorio a ${c.email}.`
      : 'Modo local: descarga el recordatorio para tu calendario.';
    const row = document.createElement('div'); row.className = 'row';
    const ics = document.createElement('button'); ics.type = 'button'; ics.className = 'btn'; ics.textContent = 'Descargar al calendario';
    ics.addEventListener('click', () => {
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([icsFor(c)], { type: 'text/calendar' }));
      a.href = url; a.download = 'cita-salon-de-belleza.ics'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    row.appendChild(ics);
    ok.append(h, p1, p2, p3, row);
    ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = '';
    if (!state.fecha || !state.hora) { msg.textContent = 'Elige fecha y hora en el cuaderno.'; return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const fd = new FormData(form);
    const c = {
      fecha: state.fecha, hora: state.hora,
      nombre: fd.get('nombre').trim(), telefono: fd.get('telefono').trim(), email: fd.get('email').trim(),
      servicio: fd.get('servicio'), notas: (fd.get('notas') || '').trim()
    };
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      if (CONFIG.backend) {
        // text/plain evita el preflight CORS; el backend parsea el JSON
        const r = await fetch(CONFIG.backend, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ accion: 'reservar', ...c }) });
        const j = await r.json();
        if (!j.ok) { msg.textContent = j.error; state.hora = null; await cargarOcupadas(state.fecha); renderSlots(); return; }
        c.codigo = j.codigo;
      } else {
        if (localCitas().some(x => x.fecha === c.fecha && x.hora === c.hora && x.estado !== 'cancelada')) {
          msg.textContent = 'Ese horario ya fue reservado. Elige otro.'; return;
        }
        c.codigo = Math.random().toString(36).slice(2, 8).toUpperCase();
        c.estado = 'activa';
        localStorage.setItem('citas', JSON.stringify([...localCitas(), c]));
      }
      showOk(c);
      form.reset(); state.fecha = null; state.hora = null; state.ocupadas = [];
      renderCal(); renderSlots();
    } catch {
      msg.textContent = 'No pudimos conectar con el servidor. Intenta de nuevo o llámanos.';
    } finally {
      btn.disabled = false;
    }
  });

  cancelForm.addEventListener('submit', async e => {
    e.preventDefault();
    cancelMsg.textContent = '';
    const fd = new FormData(cancelForm);
    const codigo = String(fd.get('codigo') || '').trim().toUpperCase();
    const email = String(fd.get('email') || '').trim().toLowerCase();
    try {
      if (CONFIG.backend) {
        const r = await fetch(CONFIG.backend, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ accion: 'cancelar', codigo, email }) });
        const j = await r.json();
        if (!j.ok) { cancelMsg.textContent = j.error; return; }
      } else {
        const all = localCitas();
        const c = all.find(x => x.codigo === codigo && x.email.toLowerCase() === email && x.estado !== 'cancelada');
        if (!c) { cancelMsg.textContent = 'No encontramos una cita activa con ese código y correo.'; return; }
        c.estado = 'cancelada';
        localStorage.setItem('citas', JSON.stringify(all));
      }
      cancelMsg.textContent = 'Tu cita fue cancelada. Te enviamos la confirmación por correo.';
      cancelForm.reset();
    } catch {
      cancelMsg.textContent = 'No pudimos conectar con el servidor. Intenta de nuevo o llámanos.';
    }
  });

  renderCal(); renderSlots();

  // El botón "Saltar animación" lleva al cuaderno y pone el foco en el formulario
  document.querySelectorAll('a[href="#agenda"]').forEach(a => a.addEventListener('click', () => {
    setTimeout(() => $('#agenda').focus({ preventScroll: true }), 600);
  }));
})();
