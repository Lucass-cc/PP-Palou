const CSRF = () => document.querySelector('meta[name="csrf-token"]').content;

function setPending(n) {
  const w = document.getElementById('pendWrap'), t = document.getElementById('pendTxt'), b = document.getElementById('navBadge');
  if (w) { w.hidden = n < 1; t.textContent = `${n} pendiente${n === 1 ? '' : 's'} TOTVS`; }
  if (b) { b.hidden = n < 1; b.textContent = n; }
}
const refreshPending = () => api('/api/sync/count').then(d => setPending(d.pending)).catch(() => {});

async function api(path, opts = {}) {
  const o = { method: opts.method || 'GET', headers: { 'X-CSRF-Token': CSRF() }, credentials: 'same-origin' };
  if (opts.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
    if (opts.form) o.body = opts.form;   // subida de archivos (multipart)
  const r = await fetch(path, o);
  if (r.status === 401 && !path.includes('/auth/login')) { location.href = '/login'; throw new Error('Sesión expirada'); }
  if (r.ok && o.method !== 'GET' && /^\/api\/(stock|products|sync)/.test(path)) setTimeout(refreshPending, 0);
  if (opts.raw && r.ok) return r;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error inesperado');
  return data;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = s => s ? new Date(s + (s.endsWith('Z') ? '' : 'Z')).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '–';
const num = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 3 });
function toast(msg, type = '') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  document.getElementById('toasts').append(t); setTimeout(() => t.remove(), 4000);
}
const typeBadge = t => `<span class="badge ${t === 'IN' ? 'b-in' : 'b-out'}">${t === 'IN' ? 'ALTA' : 'BAJA'}</span>`;
const syncBadge = s => `<span class="badge ${s === 'PENDING' ? 'b-pend' : 'b-ok'}">${s === 'PENDING' ? 'PENDIENTE' : 'PROCESADO'}</span>`;
const debounce = (f, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
function fillSelect(sel, items, valueKey, labelFn, placeholder) {
  sel.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') +
    items.map(i => `<option value="${esc(i[valueKey] ?? i)}">${esc(labelFn ? labelFn(i) : i)}</option>`).join('');
}
function movRows(list) {
  return list.map(m => `<tr><td>${fmtDate(m.created_at)}</td><td>${typeBadge(m.movement_type)}</td><td>${esc(m.code)}</td><td>${num(m.quantity)}</td><td>${syncBadge(m.sync_status)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin movimientos</td></tr>';
}
const nice = s => !s ? '' : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/\b(mp|maq)\b/g, m => m.toUpperCase());
const unitLabel = u => /^(un|unid|unidad|unidades|u\.?)$/i.test(u || '') ? 'u.' : (u || '');

document.getElementById('menuBtn')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('logoutBtn')?.addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); location.href = '/login'; });