let rows = [];
const sel = () => [...document.querySelectorAll('.pick:checked')].map(c => +c.value);
async function load() {
  try {
    rows = (await api('/api/movements/pending')).movements;
    body.innerHTML = rows.map(m => `<tr><td><input type="checkbox" class="pick" value="${m.id}"></td><td>${fmtDate(m.created_at)}</td><td>${typeBadge(m.movement_type)}</td><td>${esc(m.code)}</td><td>${num(m.quantity)}</td><td>${esc(m.warehouse)}</td><td>${esc(m.lot || '–')}</td><td>${esc(m.user)}</td><td>${syncBadge(m.sync_status)}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">No hay movimientos pendientes</td></tr>';
    all.checked = false; update();
  } catch (e) { toast(e.message, 'error'); }
}
const update = () => genBtn.disabled = !sel().length;
body.addEventListener('change', update);
all.addEventListener('change', () => { document.querySelectorAll('.pick').forEach(c => c.checked = all.checked); update(); });
genBtn.addEventListener('click', async () => {
  const ids = sel(); genBtn.disabled = true;
  try {
    const r = await api('/api/sync/csv', { method: 'POST', body: { ids, confirm: false }, raw: true });
    const url = URL.createObjectURL(await r.blob()), a = document.createElement('a');
    a.href = url; a.download = (r.headers.get('Content-Disposition') || '').split('filename=')[1] || 'movimientos.csv'; a.click(); URL.revokeObjectURL(url);
    if (confirm(`CSV generado con ${ids.length} movimiento(s).\n\n¿Confirmás que ya fue cargado en TOTVS y querés marcarlos como PROCESADOS?\n(Aceptar = marcar · Cancelar = dejarlos pendientes)`)) {
      const p = await api('/api/sync/csv', { method: 'POST', body: { ids, confirm: true } });
      toast(`${p.processed} movimiento(s) marcados como procesados`);
    }
    load();
  } catch (e) { toast(e.message, 'error'); update(); }
});
load();
