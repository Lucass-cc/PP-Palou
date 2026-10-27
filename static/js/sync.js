const $ = id => document.getElementById(id);
let rows = [], sel = new Set();
const fmtShort = s => {
  const d = new Date(s + (s.endsWith('Z') ? '' : 'Z'));
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

async function load() {
  try {
    const [p, d] = await Promise.all([api('/api/movements/pending'), api('/api/movements?status=PROCESSED&limit=15')]);
    rows = [...p.movements, ...d.movements].sort((a, b) => b.created_at.localeCompare(a.created_at));
    sel = new Set(p.movements.map(m => m.id));
    const n = p.movements.length;
    $('sbTitle').textContent = n === 0 ? 'No hay movimientos pendientes' : `${n} movimiento${n === 1 ? '' : 's'} pendiente${n === 1 ? '' : 's'}`;
    setPending(n); render();
  } catch (e) { toast(e.message, 'error'); }
}

function render() {
  $('body').innerHTML = rows.map(m => {
    const pend = m.sync_status === 'PENDING', on = sel.has(m.id);
    return `<tr class="${on ? 'sel' : ''}">
      <td><input type="checkbox" class="pick-cb" data-id="${m.id}" ${on ? 'checked' : ''} ${pend ? '' : 'disabled'}></td>
      <td class="pname"><b>${esc(m.description)}</b><small>${esc(m.code)}</small></td>
      <td class="qtyc">${m.movement_type === 'IN' ? '+' : '−'}${num(m.quantity)}</td>
      <td>${m.movement_type === 'IN' ? 'Alta' : 'Baja'}</td>
      <td class="wh">${esc(nice(m.warehouse))}</td>
      <td>${esc(m.user)}</td>
      <td>${fmtShort(m.created_at)}</td>
      <td><span class="stbadge ${pend ? 'p' : 'ok'}">${pend ? 'Pendiente' : 'Procesado'}</span></td>
      <td><a href="#" class="pick ${pend ? '' : 'off'}" data-id="${m.id}">${on ? 'Deseleccionar' : 'Seleccionar'}</a></td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" class="muted" style="padding:1.5rem">Sin movimientos</td></tr>';
  const pendIds = rows.filter(m => m.sync_status === 'PENDING').map(m => m.id), n = sel.size;
  $('selCount').textContent = `${n} seleccionado${n === 1 ? '' : 's'}`;
  $('csvBtn').disabled = n === 0; $('prepBtn').disabled = n === 0;
  const all = $('all');
  all.disabled = !pendIds.length; all.checked = n > 0 && n === pendIds.length; all.indeterminate = n > 0 && n < pendIds.length;
}

const toggle = id => { sel.has(id) ? sel.delete(id) : sel.add(id); render(); };
$('body').addEventListener('change', e => { const c = e.target.closest('.pick-cb'); if (c) toggle(+c.dataset.id); });
$('body').addEventListener('click', e => {
  const a = e.target.closest('a.pick'); if (!a) return;
  e.preventDefault(); if (!a.classList.contains('off')) toggle(+a.dataset.id);
});
$('all').addEventListener('change', e => {
  sel = new Set(e.target.checked ? rows.filter(m => m.sync_status === 'PENDING').map(m => m.id) : []); render();
});

$('csvBtn').addEventListener('click', async () => {
  try {
    const r = await api('/api/sync/csv', { method: 'POST', body: { ids: [...sel], confirm: false }, raw: true });
    const url = URL.createObjectURL(await r.blob()), a = document.createElement('a');
    a.href = url; a.download = (r.headers.get('Content-Disposition') || '').split('filename=')[1] || 'movimientos.csv';
    a.click(); URL.revokeObjectURL(url);
    toast('CSV generado. Siguen pendientes hasta que los marques como cargados.');
  } catch (e) { toast(e.message, 'error'); }
});

$('prepBtn').addEventListener('click', () => {
  const n = sel.size;
  $('okMsg').textContent = `Vas a marcar ${n} movimiento${n === 1 ? '' : 's'} como cargado${n === 1 ? '' : 's'} en TOTVS. Dejarán de figurar como pendientes; el historial se conserva.`;
  $('okDlg').showModal();
});
$('okNo').addEventListener('click', () => $('okDlg').close());
$('okYes').addEventListener('click', async () => {
  try {
    const p = await api('/api/sync/csv', { method: 'POST', body: { ids: [...sel], confirm: true } });
    $('okDlg').close(); toast(`${p.processed} movimiento(s) marcados como cargados`); load();
  } catch (e) { $('okDlg').close(); toast(e.message, 'error'); }
});

load();