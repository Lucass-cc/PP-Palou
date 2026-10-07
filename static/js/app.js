const CSRF = () => document.querySelector('meta[name="csrf-token"]').content;
async function api(path, opts = {}) {
  const o = { method: opts.method || 'GET', headers: { 'X-CSRF-Token': CSRF() }, credentials: 'same-origin' };
  if (opts.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opts.body); }
  const r = await fetch(path, o);
  if (r.status === 401 && !path.includes('/auth/login')) { location.href = '/login'; throw new Error('Sesión expirada'); }
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
document.getElementById('menuBtn')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('logoutBtn')?.addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); location.href = '/login'; });
