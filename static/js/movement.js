let type = 'IN', depots = [], stockByWh = {}, results = [], active = -1;
const $ = id => document.getElementById(id);
const form = $('mvForm'), msgEl = $('msg'), btn = $('submitBtn'), seg = document.querySelector('.seg'),
  pq = $('pq'), pid = form.elements.product_id, list = $('pList'), avail = $('avail'), recBody = $('recBody');

/* ---------- buscador de producto (una sola caja) ---------- */
const labelOf = p => `${p.code} — ${p.description}`;
function openList() { list.hidden = false; pq.setAttribute('aria-expanded', 'true'); }
function closeList() { list.hidden = true; pq.setAttribute('aria-expanded', 'false'); active = -1; }
function renderList() {
  list.innerHTML = results.length
    ? results.map((p, i) => `<li role="option" class="combo-opt${i === active ? ' on' : ''}" data-i="${i}"><b>${esc(p.code)}</b><span>${esc(p.description)}</span></li>`).join('')
    : '<li class="combo-empty">Sin resultados</li>';
}
async function search(q) {
  try {
    results = (await api('/api/products?q=' + encodeURIComponent(q))).products.slice(0, 50);
    active = -1; renderList(); openList();
  } catch (e) { toast(e.message, 'error'); }
}
async function choose(p) {
  pid.value = p.id; pq.value = labelOf(p); pq.classList.add('picked'); closeList();
  await onProductChange();
}
function clearSelection() {
  if (!pid.value) return;
  pid.value = ''; pq.classList.remove('picked'); stockByWh = {}; renderWarehouses();
}
pq.addEventListener('input', debounce(() => { clearSelection(); search(pq.value.trim()); }, 250));
pq.addEventListener('focus', () => { if (pid.value) pq.select(); else search(pq.value.trim()); });
pq.addEventListener('keydown', e => {
  if (list.hidden && e.key === 'ArrowDown') { e.preventDefault(); search(pq.value.trim()); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!results.length) return;
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
    renderList(); list.children[active]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && !list.hidden && results.length) {
    e.preventDefault(); choose(results[active >= 0 ? active : 0]);
  } else if (e.key === 'Escape') closeList();
});
list.addEventListener('mousedown', e => {
  const li = e.target.closest('[data-i]');
  if (li) { e.preventDefault(); choose(results[+li.dataset.i]); }
});
document.addEventListener('click', e => { if (!e.target.closest('.combo')) closeList(); });

/* ---------- stock por depósito ---------- */
async function onProductChange() {
  stockByWh = {};
  if (pid.value) (await api(`/api/stock?product_id=${pid.value}`)).stock.forEach(s => { stockByWh[s.warehouse_id] = s; });
  renderWarehouses();
}
function renderWarehouses() {
  const cur = form.warehouse_id.value;
  const opts = type === 'OUT' ? depots.filter(w => (stockByWh[w.id]?.quantity || 0) > 0) : depots;
  fillSelect(form.warehouse_id, opts, 'id', w => `${w.code} · ${nice(w.name)}`);
  if (opts.some(w => String(w.id) === cur)) form.warehouse_id.value = cur;
  showAvail();
}
function showAvail() {
  const rows = Object.values(stockByWh);
  if (!pid.value) { avail.textContent = ''; return; }
  if (type === 'OUT' && !form.warehouse_id.options.length) { avail.textContent = 'Este producto no tiene stock disponible para dar de baja.'; return; }
  avail.textContent = rows.length
    ? 'Stock por depósito: ' + rows.map(s => `${nice(s.warehouse)} ${num(s.quantity)} ${unitLabel(s.unit)}`).join(' · ')
    : 'Este producto todavía no tiene stock en ningún depósito.';
}
async function loadRecent() { recBody.innerHTML = movRows((await api('/api/movements?limit=10')).movements); }

seg.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  type = b.dataset.t; seg.classList.toggle('out', type === 'OUT');
  seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  btn.textContent = type === 'IN' ? 'Registrar alta' : 'Registrar baja';
  renderWarehouses();
});
form.warehouse_id.addEventListener('change', showAvail);

form.addEventListener('submit', async e => {
  e.preventDefault(); msgEl.textContent = '';
  if (!pid.value) { msgEl.textContent = 'Elegí un producto de la lista.'; pq.focus(); return; }
  btn.disabled = true;
  const f = new FormData(form);
  try {
    const r = await api('/api/stock/movement', { method: 'POST', body: {
      movement_type: type, product_id: +pid.value, warehouse_id: +f.get('warehouse_id'),
      quantity: f.get('quantity'), lot: f.get('lot'), observation: f.get('observation') } });
    toast(`${type === 'IN' ? 'Alta' : 'Baja'} registrada (pendiente de sincronización)`);
    if (r.low_stock) toast(`STOCK BAJO: ${r.stock.code} quedó en ${num(r.stock.quantity)} en ${nice(r.stock.warehouse)}`, 'warn');
    form.quantity.value = form.lot.value = form.observation.value = '';
    await onProductChange(); loadRecent();
  } catch (err) { msgEl.textContent = err.message; toast(err.message, 'error'); }
  finally { btn.disabled = false; }
});

(async () => {
  try {
    depots = (await api('/api/products/meta')).warehouses;
    const qs = new URLSearchParams(location.search);
    if (qs.get('product_id')) await choose((await api('/api/products/' + qs.get('product_id'))).product);
    else renderWarehouses();
    if (qs.get('type') === 'OUT') seg.querySelector('[data-t="OUT"]').click();
    if (qs.get('warehouse_id')) { form.warehouse_id.value = qs.get('warehouse_id'); showAvail(); }
    loadRecent();
  } catch (e) { toast(e.message, 'error'); }
})();