async function load() {
  try {
    const r = await api('/api/users');
    body.innerHTML = r.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td>
      <td><span class="badge ${u.status === 'ACTIVE' ? 'b-ok' : 'b-low'}">${u.status === 'ACTIVE' ? 'ACTIVO' : 'BLOQUEADO'}</span></td><td>${fmtDate(u.created_at)}</td>
      <td>${u.role === 'ADMIN' ? '' : `<button class="btn btn-ghost btn-sm" data-act="toggle" data-id="${u.id}" data-st="${u.status}">${u.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'}</button>
      <button class="btn btn-danger btn-sm" data-act="del" data-id="${u.id}">Eliminar</button>`}</td></tr>`).join('');
  } catch (e) { toast(e.message, 'error'); }
}
body.addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  try {
    if (b.dataset.act === 'toggle') await api('/api/users/' + b.dataset.id, { method: 'PUT', body: { status: b.dataset.st === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' } });
    else { if (!confirm('¿Eliminar este usuario definitivamente?')) return; await api('/api/users/' + b.dataset.id, { method: 'DELETE' }); }
    toast('Listo'); load();
  } catch (err) { toast(err.message, 'error'); }
});
newBtn.addEventListener('click', () => { uForm.reset(); uMsg.textContent = ''; dlg.showModal(); });
cancel.addEventListener('click', () => dlg.close());
uForm.addEventListener('submit', async e => {
  e.preventDefault();
  try { await api('/api/users', { method: 'POST', body: Object.fromEntries(new FormData(uForm)) }); dlg.close(); toast('Usuario creado'); load(); }
  catch (err) { uMsg.textContent = err.message; }
});
load();
