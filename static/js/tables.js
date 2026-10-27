const $ = id => document.getElementById(id);
const STEP = 100;
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const val = v => (v === null || v === undefined || v === '') ? '<span class="dash">–</span>' : esc(v);
const badge = (txt, bad) => `<span class="badge ${bad ? 'b-low' : 'b-ok'}">${esc(txt)}</span>`;
const code = { k: 'code', t: 'CÓDIGO', cls: 'c-code' };

/* Cómo se muestra cada tabla (columnas, búsqueda y filtros) */
const CFG = {
  products: {
    cols: [code,
      { k: 'description', t: 'DESCRIPCIÓN', r: p => `<b>${esc(p.description)}</b>${p.active ? '' : ' <span class="badge b-out">Archivado</span>'}` },
      { k: 'type', t: 'TIPO', r: p => esc(nice(p.type)) },
      { k: 'group', t: 'GRUPO', r: p => esc(nice(p.group)) },
      { k: 'unit', t: 'UNIDAD' },
      { k: 'reorder_point', t: 'PUNTO DE PEDIDO', num: true },
      { k: 'supplier', t: 'PROVEEDOR', r: p => p.supplier ? `${esc(p.supplier)}<small>${esc(nice(p.supplier_name || ''))}</small>` : val(null) },
      { k: 'lot_required', t: 'LOTE', r: p => p.lot_required ? '<span class="badge b-pend">Exige lote</span>' : val(null) }],
    search: p => `${p.code} ${p.description} ${p.type} ${p.group} ${p.supplier || ''} ${p.supplier_name || ''}`,
    prep: p => { p._state = p.active ? 'Activo' : 'Archivado'; },
    rowCls: p => p.active ? '' : 'dim',
    filters: [{ k: 'type', all: 'Todos los tipos', nice: true }, { k: 'group', all: 'Todos los grupos', nice: true },
      { k: '_state', all: 'Todos los estados', opts: ['Activo', 'Archivado'], def: 'Activo' }],
  },
  suppliers: {
    cols: [code,
      { k: 'name', t: 'RAZÓN SOCIAL', r: s => `<b>${esc(s.name)}</b>` },
      { k: 'trade_name', t: 'NOMBRE DE FANTASÍA' },
      { k: 'tax_id', t: 'CUIT/CUIL' },
      { k: 'email', t: 'E-MAIL', r: s => s.email ? `<a class="lnk" href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : val(null) },
      { k: 'phone', t: 'TELÉFONO' },
      { k: 'contact', t: 'CONTACTO' },
      { k: '_state', t: 'ESTADO', r: s => badge(s._state, s.blocked) }],
    search: s => `${s.code} ${s.name} ${s.trade_name || ''} ${s.tax_id || ''} ${s.email || ''} ${s.contact || ''}`,
    prep: s => { s._state = s.blocked ? 'Bloqueado' : 'Activo'; },
    filters: [{ k: '_state', all: 'Todos los estados', opts: ['Activo', 'Bloqueado'] }],
  },
  warehouses: {
    cols: [code, { k: 'name', t: 'DESCRIPCIÓN', r: w => `<b>${esc(nice(w.name))}</b>` },
      { k: 'stock_products', t: 'PRODUCTOS CON STOCK', num: true, calc: true },
      { k: 'stock_units', t: 'UNIDADES EN STOCK', num: true, calc: true }],
    search: w => `${w.code} ${w.name}`,
  },
  types: {
    cols: [code, { k: 'name', t: 'DESCRIPCIÓN', r: t => `<b>${esc(nice(t.name))}</b>` }, { k: 'products', t: 'PRODUCTOS', num: true, calc: true }],
    search: t => `${t.code} ${t.name}`,
  },
  groups: {
    cols: [code, { k: 'name', t: 'DESCRIPCIÓN', r: g => `<b>${esc(nice(g.name))}</b>` }, { k: 'products', t: 'PRODUCTOS', num: true, calc: true }],
    search: g => `${g.code} ${g.name}`,
  },
  imports: {
    cols: [{ k: 'created_at', t: 'FECHA', r: l => esc(fmtDate(l.created_at)) },
      { k: 'kind_label', t: 'TABLA', r: l => `<b>${esc(l.kind_label)}</b>` },
      { k: 'filename', t: 'ARCHIVO' },
      { k: 'rows', t: 'FILAS LEÍDAS', num: true },
      { k: 'source_columns', t: 'COLUMNAS DEL ARCHIVO', num: true },
      { k: 'applied', t: 'FILAS APLICADAS', num: true },
      { k: 'user', t: 'USUARIO' }],
    search: l => `${l.kind_label} ${l.filename} ${l.user}`,
  },
};

let index = [], cur = null, rows = [], view = [], shown = STEP, sortK = null, sortD = 1, filters = {};

function renderSummary(t) {
  if (t.key === 'imports') {
    $('sum').innerHTML = '<div class="sum-meta"><b>Historial de importaciones</b>Cada vez que se confirma una carga desde Excel queda registrada acá: quién, cuándo y cuántas filas y columnas tenía el archivo.</div>';
    return;
  }
  const L = t.last_import, all = L && L.source_columns <= t.kept;
  const flow = L ? `<div class="flow">
      <div><span class="n">${L.source_columns}</span><small>COLUMNAS EN TOTVS</small></div><span class="arrow">→</span>
      <div class="keep"><span class="n">${t.kept}</span><small>CAMPOS EN PALOU</small></div></div>` : '';
  const meta = L
    ? `${all ? 'PALOU guarda todos los campos del archivo.' : `De cada fila de TOTVS, PALOU conserva solo lo esencial (${t.kept} de ${L.source_columns} columnas).`}
       <span class="muted">Última importación: ${esc(fmtDate(L.created_at))} · ${esc(L.filename)} · ${L.rows} filas · ${esc(L.user)}</span>`
    : 'Todavía no hay una importación registrada para esta tabla. <a class="lnk" href="/import">Ir a Importar datos</a>';
  $('sum').innerHTML = `${flow}<div class="sum-meta"><b>Resumen de ${esc(t.label)}</b>${meta}
    <div class="sum-fields">${t.fields.map(f => `<span class="fchip">${esc(f)}</span>`).join('')}</div></div>`;
}

function renderHead() {
  const cfg = CFG[cur];
  $('thead').innerHTML = '<tr>' + cfg.cols.map(c =>
    `<th data-k="${c.k}" class="${c.num ? 'num' : ''}${c.calc ? ' calc' : ''}"${c.calc ? ' title="Calculado por PALOU: no viene de TOTVS"' : ''}>${c.t}${c.calc ? ' <em>PALOU</em>' : ''}<i class="srt">${sortK === c.k ? (sortD > 0 ? '▲' : '▼') : ''}</i></th>`).join('') + '</tr>';
}

function renderFilters() {
  const cfg = CFG[cur]; filters = {};
  $('tsel').innerHTML = (cfg.filters || []).map(f => {
    const opts = f.opts || [...new Set(rows.map(r => r[f.k]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'es'));
    filters[f.k] = f.def || '';
    return `<select data-f="${f.k}"><option value="">${esc(f.all)}</option>${opts.map(o =>
      `<option value="${esc(o)}"${o === filters[f.k] ? ' selected' : ''}>${esc(f.nice ? nice(o) : o)}</option>`).join('')}</select>`;
  }).join('');
}

const cmp = (a, b, num) => num ? (Number(a) || 0) - (Number(b) || 0)
  : String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true });

function apply() {
  const cfg = CFG[cur], q = norm($('tq').value.trim());
  view = rows.filter(r => (!q || r._q.includes(q)) && Object.entries(filters).every(([k, v]) => !v || String(r[k]) === v));
  if (sortK) { const c = cfg.cols.find(c => c.k === sortK); view.sort((a, b) => cmp(a[sortK], b[sortK], c.num) * sortD); }
  shown = STEP; render();
}

function render() {
  const cfg = CFG[cur], total = rows.length, part = view.slice(0, shown), rest = view.length - part.length;
  $('tcount').textContent = view.length === total ? `${total} fila${total === 1 ? '' : 's'}` : `${view.length} de ${total}`;
  $('tbody').innerHTML = part.map(r => `<tr class="${cfg.rowCls ? cfg.rowCls(r) : ''}">${cfg.cols.map(c =>
    `<td class="${c.cls || ''}${c.num ? ' num' : ''}">${c.r ? c.r(r) : (c.num ? num(r[c.k]) : val(r[c.k]))}</td>`).join('')}</tr>`).join('')
    || `<tr><td colspan="${cfg.cols.length}" class="muted" style="padding:1.5rem">${total
      ? 'Ninguna fila coincide con la búsqueda o los filtros.' : 'Esta tabla todavía no tiene datos. Cargala desde Importar datos.'}</td></tr>`;
  $('more').hidden = rest <= 0;
  $('moreBtn').textContent = `Mostrar más (${rest} restantes)`;
}

async function openTab(k) {
  cur = k; sortK = null; sortD = 1; $('tq').value = ''; history.replaceState(null, '', '#' + k);
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  renderSummary(index.find(t => t.key === k));
  $('thead').innerHTML = ''; $('tsel').innerHTML = ''; $('tcount').textContent = '';
  $('tbody').innerHTML = '<tr><td class="loading">Cargando…</td></tr>';
  try {
    const data = (await api('/api/tables/' + k)).rows;
    if (cur !== k) return;   // el usuario cambió de pestaña mientras cargaba
    const cfg = CFG[k]; rows = data;
    rows.forEach(r => { if (cfg.prep) cfg.prep(r); r._q = norm(cfg.search(r)); });
    renderFilters(); renderHead(); apply();
  } catch (e) { $('tbody').innerHTML = ''; toast(e.message, 'error'); }
}

$('tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) openTab(b.dataset.k); });
$('tq').addEventListener('input', debounce(apply, 200));
$('tsel').addEventListener('change', e => { const s = e.target.closest('select[data-f]'); if (s) { filters[s.dataset.f] = s.value; apply(); } });
$('thead').addEventListener('click', e => {
  const th = e.target.closest('th[data-k]'); if (!th) return;
  sortD = sortK === th.dataset.k ? -sortD : 1; sortK = th.dataset.k; renderHead(); apply();
});
$('moreBtn').addEventListener('click', () => { shown += STEP; render(); });

(async () => {
  try {
    index = (await api('/api/tables')).tables;
    $('tabs').innerHTML = index.map(t => `<button type="button" class="tab" role="tab" data-k="${t.key}">${esc(t.label)}<small>${t.count}</small></button>`).join('');
    const k = location.hash.slice(1);
    openTab(CFG[k] ? k : 'products');
  } catch (e) { toast(e.message, 'error'); }
})();