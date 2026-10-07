let type = 'IN';
const form = document.getElementById('mvForm'), msgEl = document.getElementById('msg'), btn = document.getElementById('submitBtn'), seg = document.querySelector('.seg');
async function loadProducts(q = '') {
  const r = await api('/api/products?q=' + encodeURIComponent(q));
  fillSelect(form.product_id, r.products, 'id', p => `${p.code} — ${p.description}`);
  showAvail();
}
async function showAvail() {
  const pid = form.product_id.value, wid = form.warehouse_id.value; avail.textContent = '';
  if (!pid || !wid) return;
  const r = await api(`/api/stock?product_id=${pid}&warehouse_id=${wid}`);
  const s = r.stock[0];
  avail.textContent = s ? `Disponible: ${num(s.quantity)} ${s.unit}${s.low_stock ? ' ⚠ stock bajo' : ''}` : 'Sin stock registrado en este depósito';
}
async function loadRecent() { recBody.innerHTML = movRows((await api('/api/movements?limit=10')).movements); }
seg.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  type = b.dataset.t; seg.classList.toggle('out', type === 'OUT');
  seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  btn.textContent = type === 'IN' ? 'Registrar alta' : 'Registrar baja';
});
pq.addEventListener('input', debounce(() => loadProducts(pq.value).catch(e => toast(e.message, 'error'))));
form.product_id.addEventListener('change', showAvail); form.warehouse_id.addEventListener('change', showAvail);
form.addEventListener('submit', async e => {
  e.preventDefault(); msgEl.textContent = ''; btn.disabled = true;
  const f = new FormData(form);
  try {
    const r = await api('/api/stock/movement', { method: 'POST', body: {
      movement_type: type, product_id: +f.get('product_id'), warehouse_id: +f.get('warehouse_id'),
      quantity: f.get('quantity'), lot: f.get('lot'), observation: f.get('observation') } });
    toast(`${type === 'IN' ? 'Alta' : 'Baja'} registrada (pendiente de sincronización)`);
    if (r.low_stock) toast(`STOCK BAJO: ${r.stock.code} quedó en ${num(r.stock.quantity)}`, 'warn');
    form.quantity.value = form.lot.value = form.observation.value = '';
    showAvail(); loadRecent();
  } catch (err) { msgEl.textContent = err.message; toast(err.message, 'error'); }
  finally { btn.disabled = false; }
});
(async () => {
  try {
    const m = await api('/api/products/meta');
    fillSelect(form.warehouse_id, m.warehouses, 'id', w => w.name);
    await loadProducts(); loadRecent();
  } catch (e) { toast(e.message, 'error'); }
})();
