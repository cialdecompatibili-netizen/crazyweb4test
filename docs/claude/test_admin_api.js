// Test della logica richieste API di admin/admin.js (getFiles, cache per sha, fallback REST, pollDeploy) con GitHub finto.
// Esegui dalla radice del repo: node docs/claude/test_admin_api.js   (rilanciarlo dopo ogni modifica a api/getFiles/pollDeploy)
const vm = require('vm'), fs = require('fs'), assert = require('assert');
const code = fs.readFileSync(require('path').join(__dirname, '..', '..', 'admin', 'admin.js'), 'utf8');

let calls = [], timers = [], mode = {};
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const el = (extra) => { const t = function () {}; const p = new Proxy(t, { get: (_, k) => (k in (extra || {})) ? extra[k] : (k === 'style' ? {} : p), set: (o, k, v) => { (extra || (extra = {}))[k] = v; return true; }, apply: () => p }); return p; };
const els = { tok: el({ value: 't' }), repo: el({ value: 'o/r' }) };
const ctx = {
  console, JSON, Date, Math, Promise, Object, Array, String, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, escape, unescape, btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
  document: { getElementById: id => els[id] || (els[id] = el()), addEventListener() {}, querySelector: () => el(), querySelectorAll: () => [], body: el() },
  window: { addEventListener() {} }, location: { pathname: '/site/admin/index.html', reload() {} }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout: (f, d) => { timers.push(d); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  fetch: (url, o) => {
    o = o || {}; calls.push({ url, method: o.method || 'GET', cache: o.cache, body: o.body });
    const res = (status, body) => Promise.resolve({ ok: status < 400, status, headers: { get: () => null }, json: () => Promise.resolve(body) });
    if (url.endsWith('/graphql')) {
      if (mode.gqlFail) return res(403, { message: 'no' });
      const q = JSON.parse(o.body).query, aliases = [...q.matchAll(/f(\d+):object\(expression:("(?:[^"\\]|\\.)*")/g)];
      const data = {};
      aliases.forEach(m => { const path = JSON.parse(m[2]).split(':').slice(1).join(':'); const f = mode.files[path];
        data['f' + m[1]] = f ? { oid: mode.wrongOid ? 'zzz' : f.sha, text: f.text, isTruncated: !!mode.trunc } : null; });
      return res(200, { data: { repository: data } });
    }
    const m = url.match(/\/contents\/([^?]+)/);
    if (m) { const f = mode.files[decodeURIComponent(m[1])]; if (!f || mode.restFail) return res(404, { message: 'nf' }); return res(200, { path: m[1], sha: f.sha, content: b64(f.text) }); }
    if (url.includes('/pages/builds/latest')) return res(200, { commit: 'c1', status: 'built' });
    if (url.includes('/commits/')) return res(200, { sha: 'h1' });
    if (url.includes('/actions/runs')) return res(200, { workflow_runs: [] });
    return res(200, { default_branch: 'main' });
  },
};
vm.createContext(ctx); vm.runInContext(code, ctx);
const A = ctx.A;
const F = (n, sha, text) => ({ name: n, path: '_posts/' + n, sha, text, type: 'file' });
const mk = (...fs_) => { const o = {}; fs_.forEach(f => o[f.path] = { sha: f.sha, text: f.text }); return o; };
const lst = fs_ => fs_.map(f => ({ name: f.name, path: f.path, sha: f.sha, type: 'file' }));
const reset = () => { calls = []; timers = []; };
(async () => {
  A.login(); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); reset();

  // 1) GraphQL: 3 file = 1 sola richiesta, nessuna REST
  const a = [F('a.md', 's1', 'A'), F('b.md', 's2', 'B'), F('c.md', 's3', 'C')];
  mode = { files: mk(...a) };
  let r = await A.getFiles('_posts', lst(a));
  assert.deepStrictEqual(r.map(x => x.text), ['A', 'B', 'C']); assert.strictEqual(r[0].path, '_posts/a.md'); assert.strictEqual(r[1].sha, 's2');
  assert.strictEqual(calls.length, 1); assert(calls[0].url.endsWith('/graphql')); console.log('1 ok: 3 file -> 1 richiesta GraphQL');

  // 2) di nuovo gli stessi file: cache per sha = 0 richieste
  reset(); r = await A.getFiles('_posts', lst(a)); assert.strictEqual(calls.length, 0); assert.strictEqual(r[2].text, 'C'); console.log('2 ok: rilettura = 0 richieste');

  // 3) un file cambiato (nuovo sha): solo quello viene richiesto, 1 alias
  const a2 = [a[0], F('b.md', 's2b', 'B2'), a[2]]; mode = { files: mk(...a2) }; reset();
  r = await A.getFiles('_posts', lst(a2)); assert.deepStrictEqual(r.map(x => x.text), ['A', 'B2', 'C']);
  assert.strictEqual(calls.length, 1); assert.strictEqual((JSON.parse(calls[0].body).query.match(/:object\(/g) || []).length, 1); console.log('3 ok: modificato 1 file -> 1 alias nella query');

  // 4) oid diverso da quello della lista (file cambiato nel frattempo) -> ripiega su REST per quel file
  const d = [F('d.md', 's9', 'D')]; mode = { files: mk(...d), wrongOid: true }; reset();
  r = await A.getFiles('_posts', lst(d)); assert.strictEqual(r[0].text, 'D'); assert(calls.some(c => c.url.includes('/contents/'))); console.log('4 ok: oid diverso -> fallback REST');

  // 5) testo troncato -> REST
  const e = [F('e.md', 's10', 'E')]; mode = { files: mk(...e), trunc: true }; reset();
  r = await A.getFiles('_posts', lst(e)); assert.strictEqual(r[0].text, 'E'); assert(calls.some(c => c.url.includes('/contents/'))); console.log('5 ok: troncato -> fallback REST');

  // 6) GraphQL rifiutato: fallback REST (a gruppi), poi GraphQL non viene riprovato per 5 minuti
  const g = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'].map((n, i) => F(n + '.md', 'sg' + i, n)); mode = { files: mk(...g), gqlFail: true }; reset();
  r = await A.getFiles('_posts', lst(g)); assert.deepStrictEqual(r.map(x => x.text), g.map(x => x.text));
  assert.strictEqual(calls.filter(c => c.url.endsWith('/graphql')).length, 1); assert.strictEqual(calls.filter(c => c.url.includes('/contents/')).length, 7);
  const h = [F('h.md', 'sh', 'H')]; mode = { files: mk(...h), gqlFail: true }; reset(); r = await A.getFiles('_posts', lst(h));
  assert.strictEqual(calls.filter(c => c.url.endsWith('/graphql')).length, 0); assert.strictEqual(r[0].text, 'H'); console.log('6 ok: GraphQL KO -> REST, nessun nuovo tentativo GraphQL');

  // 7) file illeggibile: null (default) oppure errore (strict)
  const x = [F('x.md', 'sx', 'X')]; mode = { files: {}, gqlFail: true }; reset();
  r = await A.getFiles('_posts', lst(x)); assert.strictEqual(r[0], null);
  await assert.rejects(A.getFiles('_posts', lst(x), { strict: true })); console.log('7 ok: illeggibile -> null / strict -> errore');

  // 8) ogni GET e' condizionale (cache:no-cache)
  reset(); mode = { files: mk(F('q.md', 'sq', 'Q')) }; await A.getFile('_posts/q.md');
  assert(calls.every(c => c.method !== 'GET' || c.cache === 'no-cache')); console.log('8 ok: GET con cache no-cache');

  // 9) pollDeploy: primo giro = 3 richieste (prima 5), poi riprogramma a 5 s
  reset(); mode = { files: {} };
  A.putFile && ctx.A; // pollDeploy e' interno: lo faccio partire con un salvataggio finto
  mode.files['_x/y.md'] = { sha: 's', text: 't' };
  const origFetch = ctx.fetch; ctx.fetch = (u, o) => (o && o.method === 'PUT') ? Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, json: () => Promise.resolve({ content: { sha: 'n' } }) }) : origFetch(u, o);
  await A.putFile('_x/y.md', 'hello', 's', 'prova'); await new Promise(r => setTimeout(r, 50));
  const poll = calls.filter(c => !(c.method === 'PUT'));
  assert.strictEqual(poll.length, 3, 'richieste nel primo giro: ' + poll.length); assert.deepStrictEqual(timers.slice(-1), [5000]); console.log('9 ok: pollDeploy primo giro = 3 richieste, prossimo giro tra 5 s');
  console.log('TUTTI I TEST OK');
})().catch(err => { console.error('FALLITO:', err.message); process.exit(1); });
