(async () => {
  try {
    const d = await api('/api/dashboard');
    kActive.textContent = d.active_products; kLow.textContent = d.low_stock_count; kPending.textContent = d.pending_count;
    lowBody.innerHTML = d.low_stock.map(s => `<tr class="low"><td>${esc(s.code)}</td><td>${esc(s.description)}</td><td>${esc(s.warehouse)}</td><td class="qty">${num(s.quantity)}</td><td>${num(s.reorder_point)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sin alertas de stock</td></tr>';
    recBody.innerHTML = movRows(d.recent_movements);
  } catch (e) { toast(e.message, 'error'); }
})();
