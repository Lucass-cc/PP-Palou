function report(r) {
  const chips = r.summary.map(([k, v]) => `<div class="chip"><b>${v}</b><small>${esc(k)}</small></div>`).join('');
  const table = (list, title, total) => list && list.length ? `<h3>${title} (${total})</h3><div class="tbl"><table class="st">
    <thead><tr><th>FILA</th><th>CÓDIGO</th><th>DETALLE</th></tr></thead><tbody>${list.map(e =>
      `<tr><td>${e.row}</td><td>${esc(e.code)}</td><td class="wrap">${esc(e.messages.join(' · '))}</td></tr>`).join('')}</tbody></table></div>` : '';
  const head = r.commit ? '<div class="imp-ok">Importación realizada.</div>'
    : '<p class="muted">Vista previa: todavía no se guardó nada.</p>';
  return head + `<div class="chips">${chips}</div>` +
    table(r.changes, r.commit ? 'Filas existentes actualizadas' : 'Cambios que se aplicarán en filas existentes', r.change_count) +
    table(r.errors, 'Filas con error: se omiten', r.error_count) + table(r.warnings, 'Avisos', r.warning_count);
}
const fmtSize = b => b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1024 / 1024).toFixed(1) + ' MB';

document.querySelectorAll('.imp').forEach(sec => {
  const q = s => sec.querySelector(s);
  const kind = sec.dataset.kind, file = q('.imp-file'), res = q('.imp-res'), go = q('.imp-go'), check = q('.imp-check'),
    upd = q('.imp-upd'), dz = q('.dz'), empty = q('.dz-empty'), chosen = q('.dz-file');

  function refresh() {
    const f = file.files[0];
    empty.hidden = !!f; chosen.hidden = !f; dz.classList.toggle('has', !!f);
    if (f) { q('.dz-name').textContent = f.name; q('.dz-size').textContent = fmtSize(f.size) + ' · listo para revisar'; }
    check.disabled = !f; go.hidden = true; res.innerHTML = '';
  }
  const send = commit => {
    const f = file.files[0];
    if (!f) { toast('Elegí un archivo .xlsx', 'error'); return null; }
    const fd = new FormData();
    fd.append('file', f); fd.append('commit', commit ? '1' : '0');
    fd.append('update_existing', upd.checked ? '1' : '0');
    return api('/api/import/' + kind, { method: 'POST', form: fd });
  };

  file.addEventListener('change', refresh);
  // si cambia la opción, la vista previa anterior ya no vale: hay que revisar de nuevo
  upd.addEventListener('change', () => { go.hidden = true; res.innerHTML = ''; });
  q('.dz-clear').addEventListener('click', () => { file.value = ''; refresh(); });
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => {
    const f = e.dataTransfer.files[0]; if (!f) return;
    if (!f.name.toLowerCase().endsWith('.xlsx')) { toast('El archivo debe ser un Excel .xlsx', 'error'); return; }
    file.files = e.dataTransfer.files; refresh();
  });

  check.addEventListener('click', async () => {
    const p = send(false); if (!p) return;
    go.hidden = true; res.innerHTML = '<div class="loading">Revisando…</div>'; check.disabled = true;
    try { const r = await p; res.innerHTML = report(r); go.hidden = !r.importable; }
    catch (e) { res.innerHTML = `<div class="msg">${esc(e.message)}</div>`; }
    finally { check.disabled = !file.files[0]; }
  });
  go.addEventListener('click', async () => {
    const msg = upd.checked ? 'Se van a agregar las filas nuevas y actualizar las existentes. ¿Importar ahora?'
      : 'Solo se van a agregar las filas nuevas; las existentes no se tocan. ¿Importar ahora?';
    if (!confirm(msg)) return;
    go.disabled = true;
    try { const r = await send(true); res.innerHTML = report(r); go.hidden = true; file.value = ''; empty.hidden = false; chosen.hidden = true; dz.classList.remove('has'); check.disabled = true; toast('Importación realizada'); }
    catch (e) { toast(e.message, 'error'); }
    finally { go.disabled = false; }
  });
});