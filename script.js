(() => {
  // ---- Configuración ----
  const CONFIG = {
    telefono: '+502 5487 0255',
    horas: ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'],
    cerradoDomingo: true,
    // Envío automático del recordatorio con EmailJS (gratis). Si lo dejas vacío,
    // el botón "Abrir correo" prepara el recordatorio en el correo del cliente.
    emailjs: { serviceId: '', templateId: '', publicKey: '' }
  };

  const SERVICES = [
    { t: 'Corte y estilo', d: 'Cortes a medida y asesoría de forma: el corte que realza tu rostro y se adapta a tu día a día.',
      svg: '<circle cx="20" cy="46" r="8"/><circle cx="44" cy="46" r="8"/><path d="M26 40 50 12M38 40 14 12"/>' },
    { t: 'Color y mechas', d: 'Coloración, balayage y mechas con productos cuidadosos que protegen la fibra capilar.',
      svg: '<rect x="24" y="8" width="16" height="30" rx="3"/><path d="M24 22h16"/><path d="M32 38c-6 8-2 16 2 16s8-8-2-16z"/>' },
    { t: 'Maquillaje', d: 'Maquillaje social, para bodas, eventos y sesiones fotográficas, con acabados que duran toda la jornada.',
      svg: '<rect x="20" y="26" width="24" height="26" rx="4"/><path d="M32 26V10M26 10h12"/>' },
    { t: 'Manicura y pedicura', d: 'Uñas impecables, diseño de nail art y tratamientos de hidratación para manos y pies.',
      svg: '<rect x="22" y="22" width="20" height="30" rx="4"/><rect x="28" y="8" width="8" height="10" rx="2"/><path d="M22 34h20"/>' },
    { t: 'Tratamientos faciales', d: 'Limpieza profunda, hidratación y terapias para una piel luminosa y equilibrada.',
      svg: '<rect x="14" y="30" width="36" height="16" rx="4"/><path d="M14 30v-4h36v4M20 22h24"/>' },
    { t: 'Peinados para ocasiones', d: 'Peinados de novia, quinceañeras y eventos especiales, listos para lucir toda la noche.',
      svg: '<rect x="12" y="20" width="40" height="10" rx="2"/><path d="M16 30v14M22 30v14M28 30v14M34 30v14M40 30v14M46 30v14"/>' }
  ];

  const $ = s => document.querySelector(s);
  const stage = $('#stage'), box = $('#box'), itemsEl = $('#items');
  const capEl = $('#caption'), bar = $('#bar');
  const N = SERVICES.length;
  const START = 0.04, STEP = 0.13, LEN = 0.3; // ventana de cada disparo (0..1 del scroll)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [];
  let R = 300, S = 240, I = 140, curIdx = -1;

  // ---- Construir objetos ----
  SERVICES.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div class="card"><svg viewBox="0 0 64 64" aria-hidden="true">${s.svg}</svg><small>${s.t}</small></div>`;
    itemsEl.appendChild(el);
    items.push(el);
  });

  // ---- Tamaños responsivos ----
  function layout() {
    const w = innerWidth;
    S = Math.round(Math.min(260, Math.max(170, w * 0.36)));
    I = Math.round(Math.min(140, Math.max(96, w * 0.28)));
    R = Math.round(Math.min(w * 0.4, 420));
    const root = document.documentElement.style;
    root.setProperty('--S', S + 'px');
    root.setProperty('--I', I + 'px');
  }

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  // ---- Render según progreso del scroll (0..1) ----
  function render(p) {
    box.style.transform = `rotateX(-16deg) rotateY(${p * 360}deg)`;

    items.forEach((el, i) => {
      const t = clamp((p - (START + i * STEP)) / LEN);
      const e = easeOutExpo(t);
      const th = (i / N) * Math.PI * 2 - Math.PI / 2; // anillo de 360° alrededor de la caja
      const x = R * Math.cos(th) * e;
      const y = R * 0.42 * Math.sin(th) * e;
      const z = -S * 0.5 + (R * 0.6 * Math.sin(th) + S * 0.5) * e; // sale desde dentro de la caja
      const scale = 0.25 + 0.75 * e;
      el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${360 * e}deg) scale(${scale})`;
      el.style.opacity = t === 0 ? 0 : Math.min(1, t * 4);
    });

    const idx = clamp(Math.floor((p - START) / STEP), 0, N - 1);
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
  const state = { cur: new Date(today.getFullYear(), today.getMonth(), 1), fecha: null, hora: null, last: null };
  const grid = $('#grid'), slotsEl = $('#slots'), monthEl = $('#month'), form = $('#form'), msg = $('#msg'), ok = $('#ok');
  const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtFecha = key => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };
  const getCitas = () => { try { return JSON.parse(localStorage.getItem('citas') || '[]'); } catch { return []; } };

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
      b.addEventListener('click', () => { state.fecha = key; state.hora = null; renderCal(); renderSlots(); });
      grid.appendChild(b);
    }
  }

  function renderSlots() {
    slotsEl.innerHTML = '';
    if (!state.fecha) { slotsEl.innerHTML = '<p class="hint">Elige un día para ver los horarios.</p>'; return; }
    const ocupadas = getCitas().filter(c => c.fecha === state.fecha).map(c => c.hora);
    const now = new Date();
    CONFIG.horas.forEach(h => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot' + (state.hora === h ? ' sel' : '');
      b.textContent = h;
      b.disabled = ocupadas.includes(h) || new Date(`${state.fecha}T${h}:00`) < now;
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
      `SUMMARY:Cita - Salón de Belleza (${c.servicio})`, `DESCRIPTION:Tel. ${CONFIG.telefono}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Mañana tienes tu cita', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Tu cita es en una hora', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  function textoRecordatorio(c) {
    return `Hola ${c.nombre}, te recordamos tu cita en Salón de Belleza.\n\n` +
      `Fecha: ${fmtFecha(c.fecha)}\nHora: ${c.hora}\nServicio: ${c.servicio}\n\n` +
      `Si necesitas cambiarla, llámanos al ${CONFIG.telefono}.\n\n¡Te esperamos!`;
  }
  const mailtoFor = c => `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Recordatorio de tu cita - Salón de Belleza')}&body=${encodeURIComponent(textoRecordatorio(c))}`;

  // Envío automático por EmailJS si está configurado
  async function enviarRecordatorio(c) {
    const e = CONFIG.emailjs;
    if (!e.serviceId || !e.templateId || !e.publicKey) return false;
    try {
      const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: e.serviceId, template_id: e.templateId, user_id: e.publicKey,
          template_params: { to_email: c.email, to_name: c.nombre, fecha: fmtFecha(c.fecha), hora: c.hora,
            servicio: c.servicio, telefono: CONFIG.telefono, mensaje: textoRecordatorio(c) }
        })
      });
      return r.ok;
    } catch { return false; }
  }

  function showOk(c, sent) {
    ok.hidden = false;
    ok.replaceChildren();
    const h = document.createElement('h3'); h.textContent = '¡Cita agendada!';
    const p1 = document.createElement('p'); p1.textContent = `${fmtFecha(c.fecha)} a las ${c.hora} · ${c.servicio}`;
    const p2 = document.createElement('p');
    p2.textContent = sent ? `Te enviamos el recordatorio a ${c.email}.`
      : 'Descarga el recordatorio para tu calendario o envíalo por correo desde aquí.';
    const row = document.createElement('div'); row.className = 'row';
    const ics = document.createElement('button'); ics.type = 'button'; ics.className = 'btn'; ics.textContent = 'Descargar al calendario';
    ics.addEventListener('click', () => {
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([icsFor(c)], { type: 'text/calendar' }));
      a.href = url; a.download = 'cita-salon-de-belleza.ics'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    row.appendChild(ics);
    if (!sent) {
      const mail = document.createElement('a'); mail.className = 'btn alt'; mail.href = mailtoFor(c); mail.textContent = 'Abrir correo con el recordatorio';
      row.appendChild(mail);
    }
    ok.append(h, p1, p2, row);
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
    if (getCitas().some(x => x.fecha === c.fecha && x.hora === c.hora)) {
      msg.textContent = 'Ese horario ya fue reservado. Elige otro.';
      state.hora = null; renderSlots(); return;
    }
    localStorage.setItem('citas', JSON.stringify([...getCitas(), c]));
    const sent = await enviarRecordatorio(c);
    showOk(c, sent);
    form.reset(); state.fecha = null; state.hora = null;
    renderCal(); renderSlots();
  });

  renderCal(); renderSlots();

  // El botón "Saltar animación" lleva al cuaderno y pone el foco en el formulario
  document.querySelectorAll('a[href="#agenda"]').forEach(a => a.addEventListener('click', () => {
    setTimeout(() => $('#agenda').focus({ preventScroll: true }), 600);
  }));
})();
