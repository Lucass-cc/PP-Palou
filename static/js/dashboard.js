const ALERT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
let low = [];
function renderLow() {
  const q = lowQ.value.trim().toLowerCase();
  const rows = low.filter(s => !q || (s.code + ' ' + s.description).toLowerCase().includes(q));
  lowList.innerHTML = rows.map(s => `<div class="lrow">
    <span class="ibox red">${ALERT}</span>
    <div class="lname"><b>${esc(s.description)}</b><small>${esc(s.code)} · ${esc(nice(s.group))}</small></div>
    <div class="lcol"><small>DEPÓSITO</small><b>${esc(nice(s.warehouse))}</b></div>
    <div class="lcol"><small>STOCK ACTUAL</small><b class="red big">${num(s.quantity)} <i>${esc(unitLabel(s.unit))}</i></b></div>
    <div class="lcol"><small>PUNTO DE PEDIDO</small><b>${num(s.reorder_point)} ${esc(unitLabel(s.unit))}</b></div>
    <a class="lact" href="/movement?type=IN&code=${encodeURIComponent(s.code)}&product_id=${s.product_id}&warehouse_id=${s.warehouse_id}">Registrar alta ${ARROW}</a>
  </div>`).join('') || `<div class="empty">${low.length ? 'Sin coincidencias' : 'Sin alertas de stock'}</div>`;
}
lowQ.addEventListener('input', renderLow);
(async () => {
  try {
    const d = await api('/api/dashboard');
    kActive.textContent = d.active_products; kActiveN.textContent = `En ${d.warehouses_count} depósito${d.warehouses_count === 1 ? '' : 's'}`;
    kLow.textContent = d.low_stock_count; kPending.textContent = d.pending_count;
    lowPill.textContent = `${d.low_stock_count} producto${d.low_stock_count === 1 ? '' : 's'}`;
    setPending(d.pending_count);
    low = d.low_stock; renderLow();
  } catch (e) { lowList.innerHTML = ''; toast(e.message, 'error'); }
})();