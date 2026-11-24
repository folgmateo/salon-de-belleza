// Backend del Salón de Belleza (Google Apps Script).
// Guarda las citas en una hoja de cálculo, envía correos (cliente y tú) y maneja cancelaciones.
// Instalación: ver backend/LEEME.md

const OWNER = 'mfolgar08@gmail.com';   // a dónde te llegan los avisos
const SALON = 'Salón de Belleza';
const TEL = '+502 5487 0255';
const HORAS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
const TZ = 'America/Guatemala';
const HOJA = 'Citas';
const COLS = ['id','fecha','hora','nombre','telefono','email','servicio','notas','estado','codigo','creada','recordatorio'];

// ---------- utilidades ----------
function hoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) { sh = ss.insertSheet(HOJA); sh.appendRow(COLS); sh.setFrozenRows(1); }
  return sh;
}

// Lee todas las citas como objetos. Normaliza fecha/hora por si Sheets las convierte a Date.
function citas_() {
  const v = hoja_().getDataRange().getValues();
  const h = v.shift();
  return v.map((r, i) => {
    const o = { _row: i + 2 };
    h.forEach((k, j) => o[k] = r[j]);
    if (o.fecha instanceof Date) o.fecha = Utilities.formatDate(o.fecha, TZ, 'yyyy-MM-dd');
    if (o.hora instanceof Date) o.hora = Utilities.formatDate(o.hora, TZ, 'HH:mm');
    o.email = String(o.email || '').toLowerCase();
    return o;
  });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
const limpia_ = (s, n) => String(s || '').trim().slice(0, n);

function correo_(to, subject, body) {
  try { MailApp.sendEmail({ to, subject, body, name: SALON }); } catch (err) { Logger.log('correo: ' + err); }
}

// ---------- API ----------
// GET ?fecha=YYYY-MM-DD  -> horas ya reservadas ese día
function doGet(e) {
  const fecha = limpia_(e.parameter.fecha, 10);
  const ocupadas = citas_().filter(c => c.estado === 'activa' && c.fecha === fecha).map(c => c.hora);
  return json_({ ok: true, ocupadas });
}

// POST (texto JSON) con accion = 'reservar' | 'cancelar'
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.accion === 'reservar') return json_(reservar_(d));
    if (d.accion === 'cancelar') return json_(cancelar_(d));
    return json_({ ok: false, error: 'Acción no válida' });
  } catch (err) {
    return json_({ ok: false, error: 'No pudimos procesar la solicitud' });
  } finally {
    lock.releaseLock();
  }
}

function reservar_(d) {
  const fecha = limpia_(d.fecha, 10), hora = limpia_(d.hora, 5);
  const nombre = limpia_(d.nombre, 80), tel = limpia_(d.telefono, 20), email = limpia_(d.email, 120).toLowerCase();
  const servicio = limpia_(d.servicio, 60), notas = limpia_(d.notas, 300);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !HORAS.includes(hora)) return { ok: false, error: 'Fecha u hora no válida' };
  if (!nombre || !tel || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Faltan datos o el correo no es válido' };
  if (new Date(fecha + 'T' + hora + ':00-06:00') < new Date()) return { ok: false, error: 'Esa hora ya pasó' };
  if (citas_().some(c => c.estado === 'activa' && c.fecha === fecha && c.hora === hora)) {
    return { ok: false, error: 'Ese horario ya fue reservado. Elige otro.' };
  }
  const codigo = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  hoja_().appendRow([Utilities.getUuid(), fecha, hora, nombre, tel, email, servicio, notas, 'activa', codigo, new Date(), '']);
  const c = { fecha, hora, nombre, email, servicio, notas, codigo, tel };
  correo_(email, 'Tu cita está confirmada - ' + SALON, textoCliente_(c));
  correo_(OWNER, 'Nueva cita: ' + nombre + ' · ' + fecha + ' ' + hora, textoDueno_(c));
  return { ok: true, codigo };
}

function cancelar_(d) {
  const codigo = limpia_(d.codigo, 10).toUpperCase(), email = limpia_(d.email, 120).toLowerCase();
  const c = citas_().find(x => x.estado === 'activa' && x.codigo === codigo && x.email === email);
  if (!c) return { ok: false, error: 'No encontramos una cita activa con ese código y correo' };
  hoja_().getRange(c._row, COLS.indexOf('estado') + 1).setValue('cancelada');
  correo_(c.email, 'Tu cita fue cancelada - ' + SALON, 'Hola ' + c.nombre + ', cancelaste tu cita del ' + c.fecha + ' a las ' + c.hora + '.\nPara reservar otra fecha visita nuestra página.\n\n' + SALON + ' · ' + TEL);
  correo_(OWNER, 'Cita cancelada: ' + c.nombre + ' · ' + c.fecha + ' ' + c.hora, 'Código ' + codigo + ' cancelado por el cliente.');
  return { ok: true };
}

// ---------- textos de correo ----------
function textoCliente_(c) {
  return 'Hola ' + c.nombre + ', tu cita quedó confirmada.\n\n' +
    'Fecha: ' + c.fecha + '\nHora: ' + c.hora + '\nServicio: ' + c.servicio + '\n\n' +
    'Código de cita: ' + c.codigo + ' (guárdalo para cancelar).\n' +
    'Te enviaremos un recordatorio un día antes.\n\n¡Te esperamos!\n' + SALON + ' · ' + TEL;
}
function textoDueno_(c) {
  return 'Nueva cita agendada:\n\nCliente: ' + c.nombre + '\nTeléfono: ' + c.tel + '\nCorreo: ' + c.email +
    '\nFecha: ' + c.fecha + ' ' + c.hora + '\nServicio: ' + c.servicio + '\nNotas: ' + (c.notas || '-') + '\nCódigo: ' + c.codigo;
}
function textoRecordatorio_(c) {
  return 'Hola ' + c.nombre + ', te recordamos tu cita de mañana.\n\nFecha: ' + c.fecha + '\nHora: ' + c.hora +
    '\nServicio: ' + c.servicio + '\n\nSi necesitas cancelar, usa el código ' + c.codigo + ' en nuestra página.\n' +
    SALON + ' · ' + TEL;
}

// ---------- recordatorios automáticos ----------
// Un disparador por hora revisa las citas que empiezan entre 22 y 26 horas y envía el recordatorio una sola vez.
function recordatorios() {
  const ahora = Date.now(), sh = hoja_();
  citas_().forEach(c => {
    if (c.estado !== 'activa' || c.recordatorio === 'enviado') return;
    const dif = new Date(c.fecha + 'T' + c.hora + ':00-06:00').getTime() - ahora;
    if (dif >= 22 * 3600e3 && dif <= 26 * 3600e3) {
      correo_(c.email, 'Recordatorio: mañana tienes tu cita - ' + SALON, textoRecordatorio_(c));
      sh.getRange(c._row, COLS.indexOf('recordatorio') + 1).setValue('enviado');
    }
  });
}

// Ejecuta esta función UNA vez desde el editor (botón ▶) para crear la hoja y el disparador horario.
function instalar() {
  hoja_();
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('recordatorios').timeBased().everyHours(1).create();
}
