const $ = id => document.getElementById(id);
const lf = $('loginForm'), rf = $('resetForm'), msg = $('msg'), rMsg = $('rMsg');
const show = login => { $('viewLogin').hidden = !login; $('viewReset').hidden = login; msg.textContent = rMsg.textContent = ''; };
$('toReset').addEventListener('click', e => { e.preventDefault(); show(false); });
$('toLogin').addEventListener('click', e => { e.preventDefault(); show(true); });
$('eye').addEventListener('click', () => {
  const p = $('pw'), shown = p.type === 'text'; p.type = shown ? 'password' : 'text';
  $('eye').setAttribute('aria-label', shown ? 'Mostrar contraseña' : 'Ocultar contraseña');
});
lf.addEventListener('submit', async e => {
  e.preventDefault(); msg.textContent = '';
  const f = new FormData(lf);
  if (!f.get('username').trim() || !f.get('password')) { msg.textContent = 'Completá usuario y contraseña.'; return; }
  $('loginBtn').disabled = true;
  try { await api('/api/auth/login', { method: 'POST', body: { username: f.get('username'), password: f.get('password') } }); location.href = '/dashboard'; }
  catch (err) { msg.textContent = err.message; $('loginBtn').disabled = false; }
});
$('reqBtn').addEventListener('click', async () => {
  try { const r = await api('/api/auth/reset-request', { method: 'POST', body: { username: rf.username.value } }); toast(r.message); }
  catch (err) { rMsg.textContent = err.message; }
});
rf.addEventListener('submit', async e => {
  e.preventDefault(); rMsg.textContent = '';
  try { await api('/api/auth/reset-confirm', { method: 'POST', body: { token: rf.token.value, password: rf.password.value } }); toast('Contraseña actualizada'); rf.reset(); show(true); }
  catch (err) { rMsg.textContent = err.message; }
});
