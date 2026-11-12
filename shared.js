/* Funzioni condivise tra pagina e service worker (date + notifiche) */
const CASA = {
  iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  today() { return CASA.iso(new Date()); },
  parse(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); },
  diff(a, b) { return Math.round((CASA.parse(b) - CASA.parse(a)) / 864e5); },
  /* ricorrenza del compleanno nell'anno y (29 feb -> 28 feb negli anni non bisestili) */
  occ(birth, y) {
    const b = CASA.parse(birth); const d = new Date(y, b.getMonth(), b.getDate());
    return d.getMonth() !== b.getMonth() ? new Date(y, b.getMonth() + 1, 0) : d;
  },
  nextBd(birth, from) {
    const f = CASA.parse(from); let d = CASA.occ(birth, f.getFullYear());
    if (d < f) d = CASA.occ(birth, f.getFullYear() + 1);
    return { date: CASA.iso(d), age: d.getFullYear() - CASA.parse(birth).getFullYear() };
  },
  add(s, n, u) {
    const d = CASA.parse(s);
    if (u === 'g') { d.setDate(d.getDate() + n); return CASA.iso(d); }
    if (u === 's') { d.setDate(d.getDate() + 7 * n); return CASA.iso(d); }
    const months = u === 'a' ? 12 * n : n, day = d.getDate();
    const t = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(day, last)); return CASA.iso(t);
  },
  fmt(s) { return s ? s.split('-').reverse().join('/') : ''; },
  /* cosa va notificato oggi */
  due(S, t) {
    const out = [];
    (S.bd || []).forEach(b => {
      const n = CASA.nextBd(b.data, t), g = CASA.diff(t, n.date);
      if (g === 0) out.push({ key: t + '|' + b.id, title: '🎂 Oggi è il compleanno di ' + b.nome, body: 'Compie ' + n.age + ' anni' });
      else if (g <= 3) out.push({ key: t + '|' + b.id, title: '🎂 Compleanno di ' + b.nome + (g === 1 ? ' domani' : ' tra ' + g + ' giorni'), body: 'Compirà ' + n.age + ' anni il ' + CASA.fmt(n.date) });
    });
    (S.rec || []).forEach(r => {
      const g = CASA.diff(t, r.data), av = r.avviso === '' || r.avviso == null ? 3 : r.avviso;
      if (g <= av) out.push({ key: t + '|' + r.id, title: '🔁 Scadenza: ' + r.titolo, body: g < 0 ? 'Scaduta da ' + (-g) + ' giorni' : g === 0 ? 'Scade oggi' : g === 1 ? 'Scade domani' : 'Scade tra ' + g + ' giorni (' + CASA.fmt(r.data) + ')' });
    });
    (S.todo || []).forEach(o => {
      if (o.fatto || !o.data) return; const g = CASA.diff(t, o.data);
      if (g === 0 || g === 1) out.push({ key: t + '|' + o.id, title: '✅ Da fare: ' + o.titolo, body: g === 0 ? 'Scade oggi' : 'Scade domani' });
    });
    return out;
  },
  async getJ(name) { const c = await caches.open('casa-data'); const r = await c.match(name); return r ? r.json() : null; },
  async putJ(name, o) { const c = await caches.open('casa-data'); await c.put(name, new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } })); },
  /* mostra le notifiche del giorno, una sola volta ciascuna */
  async notify(reg, S) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 0;
    const t = CASA.today(); let seen = await CASA.getJ('./_notified').catch(() => null);
    if (!seen || seen.day !== t) seen = { day: t, keys: [] };
    let n = 0;
    for (const x of CASA.due(S, t)) {
      if (seen.keys.includes(x.key)) continue;
      await reg.showNotification(x.title, { body: x.body, tag: x.key, icon: 'icon-192.png', badge: 'icon-192.png' });
      seen.keys.push(x.key); n++;
    }
    await CASA.putJ('./_notified', seen).catch(() => {});
    return n;
  }
};
