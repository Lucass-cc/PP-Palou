const $ = id => document.getElementById(id);
const dlg = $('dlg'), pForm = $('pForm'), cDlg = $('cDlg'), cForm = $('cForm'), tb = $('body');
let rows = [], editId = null, countRow = null;

const svg = p => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const PEN = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>');
const TRASH = svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>');
const WARN = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg>';
const fmtDay = s => s ? new Date(s + (s.endsWith('Z') ? '' : 'Z')).toLocaleDateString('es-AR') : null;

async function load() {
  tb.innerHTML = '<tr><td colspan="10" class="loading">Cargando…</td></tr>';
  const p = new URLSearchParams({ q: $('fq').value, group: $('fgroup').value, supplier: $('fsup').value,
    warehouse_id: $('fwh').value, low: $('flow').checked ? '1' : '' });
  try {
    rows = (await api('/api/stock?' + p)).stock;
    tb.innerHTML = rows.map((s, i) => `<tr class="${s.low_stock ? 'low' : ''}">
      <td class="c-code">${esc(s.code)}</td>
      <td class="c-desc"><b>${esc(s.description)}</b><small>${esc(nice(s.group))}</small></td>
      <td>${esc(nice(s.type))}</td>
      <td class="c-wh">${esc(nice(s.warehouse))}</td>
      <td class="c-qty"><b>${num(s.quantity)} ${esc(unitLabel(s.unit))}</b>${s.low_stock ? `<small>${WARN} Stock bajo</small>` : ''}</td>
      <td>${num(s.reorder_point)} ${esc(unitLabel(s.unit))}</td>
      <td>${esc(s.lot || '–')}</td>
      <td class="c-ctl"><span>${fmtDay(s.last_control_date) || 'Sin control'}</span><a href="#" data-a="count" data-i="${i}">Registrar hoy</a></td>
      <td class="c-obs">${esc(s.observation || '–')}</td>
      <td class="acts"><button class="ib" data-a="edit" data-i="${i}" title="Editar">${PEN}</button>${IS_ADMIN ? `<button class="ib del" data-a="del" data-i="${i}" title="Eliminar">${TRASH}</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="10" class="muted" style="padding:1.5rem">Sin resultados</td></tr>';
  } catch (e) { tb.innerHTML = ''; toast(e.message, 'error'); }
}

async function loadMeta() {
  const m = await api('/api/products/meta');
  const keep = ['fgroup', 'fsup', 'fwh'].map(id => [id, $(id).value]);
  fillSelect($('fgroup'), m.groups, 'code', g => nice(g.description), 'Todos los grupos');
  fillSelect($('fsup'), m.suppliers, 'code', s => `${s.code} · ${s.name}`, 'Proveedor estándar');
  fillSelect($('pSup'), m.suppliers, 'code', s => `${s.code} · ${s.name}`, 'Sin proveedor');
  fillSelect($('fwh'), m.warehouses, 'id', w => nice(w.name), 'Todos los depósitos');
  keep.forEach(([id, v]) => { $(id).value = v; });
  fillSelect($('pWh'), m.warehouses, 'id', w => `${w.code} · ${nice(w.name)}`);
  fillSelect($('pType'), m.types, 'code', t => `${t.code} · ${nice(t.description)}`, 'Seleccionar…');
  fillSelect($('pGroup'), m.groups, 'code', g => `${g.code} · ${nice(g.description)}`, 'Seleccionar…');
  $('dUnits').innerHTML = m.units.map(v => `<option value="${esc(v)}">`).join('');
}

[$('fgroup'), $('fsup'), $('fwh'), $('flow')].forEach(el => el.addEventListener('change', load));
$('fq').addEventListener('input', debounce(load));

/* ---------- alta / edición ---------- */
function openProduct(p) {
  editId = p ? p.id : null;
  pForm.reset(); $('pMsg').textContent = '';
  $('pTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
  dlg.classList.toggle('editing', !!p);
  dlg.querySelectorAll('.only-new input, .only-new select').forEach(e => e.disabled = !!p);
  dlg.querySelectorAll('.only-edit input').forEach(e => e.disabled = !p);
  if (p) {
    for (const k of ['code', 'unit', 'description', 'type', 'group', 'reorder_point', 'standard_supplier', 'observation'])
      pForm.elements[k].value = p[k] ?? '';
    pForm.elements.lot_required.checked = !!p.lot_required;
    pForm.elements.active.checked = !!p.active;
  }
  dlg.showModal();
}
$('newBtn').addEventListener('click', () => openProduct(null));
$('cancel').addEventListener('click', () => dlg.close());
pForm.addEventListener('submit', async e => {
  e.preventDefault(); $('pMsg').textContent = '';
  const f = Object.fromEntries(new FormData(pForm));
  f.lot_required = pForm.elements.lot_required.checked;
  try {
    if (editId) {
      f.active = pForm.elements.active.checked;
      await api('/api/products/' + editId, { method: 'PUT', body: f });
      toast('Producto actualizado');
    } else {
      f.warehouse_id = +f.warehouse_id;
      await api('/api/products', { method: 'POST', body: f });
      toast('Producto creado');
    }
    dlg.close(); await loadMeta(); load();
  } catch (err) { $('pMsg').textContent = err.message; }
});

/* ---------- conteo ---------- */
function diffText() {
  const v = cForm.elements.counted.value;
  if (v === '' || !countRow) { $('cDiff').textContent = ''; return; }
  const d = Math.round((Number(v) - countRow.quantity) * 1000) / 1000;
  $('cDiff').className = 'cdiff' + (d === 0 ? '' : d > 0 ? ' up' : ' down');
  $('cDiff').textContent = d === 0 ? 'Sin diferencia: el stock coincide.'
    : `Diferencia: ${d > 0 ? '+' : ''}${num(d)}. El stock pasará de ${num(countRow.quantity)} a ${num(v)}.`;
}
cForm.elements.counted.addEventListener('input', diffText);
$('cCancel').addEventListener('click', () => cDlg.close());
cForm.addEventListener('submit', async e => {
  e.preventDefault(); $('cMsg').textContent = '';
  try {
    const r = await api('/api/stock/control', { method: 'POST', body: {
      product_id: countRow.product_id, warehouse_id: countRow.warehouse_id,
      counted_quantity: cForm.elements.counted.value, observation: cForm.elements.observation.value } });
    cDlg.close();
    toast(r.difference === 0 ? 'Control registrado: sin diferencias'
      : `Stock ajustado de ${num(r.previous)} a ${num(r.stock.quantity)}. Ajuste pendiente de sincronización.`);
    if (r.stock.low_stock) toast(`STOCK BAJO: ${r.stock.code} quedó en ${num(r.stock.quantity)}`, 'warn');
    load();
  } catch (err) { $('cMsg').textContent = err.message; }
});

/* ---------- acciones de fila ---------- */
tb.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  e.preventDefault();
  const s = rows[+b.dataset.i];
  try {
    if (b.dataset.a === 'count') {
      countRow = s; cForm.reset(); $('cMsg').textContent = ''; $('cDiff').textContent = '';
      $('cInfo').textContent = `${s.code} — ${s.description} · ${nice(s.warehouse)}`;
      $('cSys').textContent = `${num(s.quantity)} ${unitLabel(s.unit)}`;
      cDlg.showModal();
    } else if (b.dataset.a === 'edit') {
      openProduct((await api('/api/products/' + s.product_id)).product);
    } else if (b.dataset.a === 'del') {
      if (!confirm(`¿Eliminar "${s.description}" (${s.code})?\n\nSi ya tiene movimientos, se archiva para no perder el historial.`)) return;
      const r = await api('/api/products/' + s.product_id, { method: 'DELETE' });
      toast(r.archived ? 'Producto archivado (tenía historial)' : 'Producto eliminado');
      await loadMeta(); load();
    }
  } catch (err) { toast(err.message, 'error'); }
});

$('flow').checked = new URLSearchParams(location.search).get('low') === '1';
loadMeta().then(load).catch(e => toast(e.message, 'error'));