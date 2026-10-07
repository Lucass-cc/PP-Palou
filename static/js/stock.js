const $ = id => document.getElementById(id), dlg = $('dlg'), pForm = $('pForm');
async function load() {
  body.innerHTML = '<tr><td colspan="10" class="loading">Cargando…</td></tr>';
  const p = new URLSearchParams({ q: fq.value, group: fgroup.value, supplier: fsup.value, warehouse_id: fwh.value, low: flow.checked ? '1' : '' });
  try {
    const r = await api('/api/stock?' + p);
    body.innerHTML = r.stock.map(s => `<tr class="${s.low_stock ? 'low' : ''}">
      <td>${esc(s.code)}</td><td>${esc(s.description)}</td><td>${esc(s.type)}</td><td>${esc(s.warehouse)}</td>
      <td class="qty">${num(s.quantity)} ${esc(s.unit)} ${s.low_stock ? '<span class="badge b-low">STOCK BAJO</span>' : ''}</td>
      <td>${num(s.reorder_point)}</td><td>${esc(s.lot || '–')}</td><td>${fmtDate(s.last_control_date)}</td>
      <td class="wrap">${esc(s.observation || '')}</td>
      <td><button class="btn btn-ghost btn-sm" data-pid="${s.product_id}" data-wid="${s.warehouse_id}">Controlar</button></td></tr>`).join('') || '<tr><td colspan="10" class="muted">Sin resultados</td></tr>';
  } catch (e) { body.innerHTML = ''; toast(e.message, 'error'); }
}
async function loadMeta() {
  const m = await api('/api/products/meta');
  fillSelect(fgroup, m.groups, null, null, 'Todos los grupos'); fillSelect(fsup, m.suppliers, null, null, 'Todos los proveedores');
  fillSelect(fwh, m.warehouses, 'id', w => w.name, 'Todos los depósitos'); fillSelect($('pWh'), m.warehouses, 'id', w => w.name);
  for (const [id, list] of [['dUnits', m.units], ['dTypes', m.types], ['dGroups', m.groups], ['dSups', m.suppliers]])
    $(id).innerHTML = list.map(v => `<option value="${esc(v)}">`).join('');
}
[fgroup, fsup, fwh, flow].forEach(el => el.addEventListener('change', load)); fq.addEventListener('input', debounce(load));
body.addEventListener('click', async e => {
  const b = e.target.closest('button[data-pid]'); if (!b) return;
  const obs = prompt('Control de stock — observación (opcional):'); if (obs === null) return;
  try { await api('/api/stock/control', { method: 'POST', body: { product_id: +b.dataset.pid, warehouse_id: +b.dataset.wid, observation: obs } }); toast('Control registrado'); load(); }
  catch (err) { toast(err.message, 'error'); }
});
newBtn.addEventListener('click', () => { pForm.reset(); pMsg.textContent = ''; dlg.showModal(); });
$('cancel').addEventListener('click', () => dlg.close());
pForm.addEventListener('submit', async e => {
  e.preventDefault(); pMsg.textContent = '';
  const f = Object.fromEntries(new FormData(pForm)); f.warehouse_id = +f.warehouse_id; f.lot_required = pForm.lot_required.checked;
  try { await api('/api/products', { method: 'POST', body: f }); dlg.close(); toast('Producto creado'); await loadMeta(); load(); }
  catch (err) { pMsg.textContent = err.message; }
});
loadMeta().then(load).catch(e => toast(e.message, 'error'));
