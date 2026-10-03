/* Immagini (assets/img/) + Impostazioni (_config.yml). Vedi claude.md */
(function (A) {
  var $ = A.$, esc = A.esc, M = function () { return A.main(); };
  var IMG = /\.(jpe?g|png|gif|webp|svg)$/i;

  A.views.media = function () {
    return A.getDir('assets/img').then(function (l) {
      var files = l.filter(function (f) { return f.type === 'file' && IMG.test(f.name); });
      var h = '<h2>Immagini</h2><div class="card"><input id="up" type="file" accept="image/*" multiple>' +
        '<p><button class="btn primary" onclick="A.upload()">Carica</button> <small>Vanno in assets/img/. Usa nei contenuti: assets/img/nome.jpg</small></p></div><div class="card"><div class="grid">';
      files.forEach(function (f) {
        h += '<div class="im"><img loading="lazy" src="' + esc(f.download_url) + '"><div>' + esc(f.name) + '</div>' +
          '<button class="btn sm" onclick="A.copyImg(\'' + esc(f.name) + '\')">Copia</button>' +
          '<button class="btn sm danger" onclick="A.delImg(\'' + esc(f.name) + '\')">x</button></div>';
      });
      M().innerHTML = h + '</div>' + (files.length ? '' : 'Nessuna immagine.') + '</div>';
    });
  };
  A.copyImg = function (n) {
    var t = 'assets/img/' + n;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { A.toast('Copiato: ' + t); });
    else A.toast(t);
  };
  /* A.upload: carica in assets/img/. PUNTI CRITICI: (1) il file va inviato in base64 SENZA il prefisso 'data:...;base64,' (per questo split(',')[1]) e putFile con isB64=true, altrimenti lo ricodifica e l'immagine e' corrotta. (2) il nome e' normalizzato (minuscolo, solo a-z0-9._-): niente spazi ne' maiuscole, i percorsi su GitHub Pages sono case-sensitive. (3) se il file esiste gia' si legge lo sha e lo si sovrascrive; senza sha GitHub risponde 422. (4) upload in sequenza, un commit per file. Limite: file molto grandi (oltre ~25 MB) vengono rifiutati dall'API. [FONTE: docs.github.com REST 'Create or update file contents'] */
  A.upload = A.wrap(function () {
    var fs = $('up').files; if (!fs.length) return A.toast('Scegli un file', true);
    var arr = Array.prototype.slice.call(fs);
    return arr.reduce(function (pr, f) {
      return pr.then(function () {
        return new Promise(function (ok, ko) {
          var r = new FileReader();
          r.onload = function () { ok(r.result.split(',')[1]); }; r.onerror = ko; r.readAsDataURL(f);
        }).then(function (b64) {
          var name = f.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
          return A.getFile('assets/img/' + name).then(function (ex) { return ex.sha; }, function () { return ''; })
            .then(function (sha) { return A.putFile('assets/img/' + name, b64, sha, 'admin: immagine ' + name, true); });
        });
      });
    }, Promise.resolve()).then(function () { A.toast('Caricate'); A.go('media'); });
  });
  /* A.delImg: elimina un'immagine. NON controlla se e' usata in post/pagine: se lo e', li' resta un'immagine rotta. Cercare il nome (es. con la ricerca del repo) prima di eliminare. */
  A.delImg = A.wrap(function (n) {
    if (!confirm('Eliminare ' + n + '?')) return;
    return A.getFile('assets/img/' + n).then(function (f) { return A.delFile('assets/img/' + n, f.sha); })
      .then(function () { A.toast('Eliminata'); A.go('media'); });
  });

  /* ---- Impostazioni: solo campi semplici di _config.yml, edit chirurgico riga per riga ---- */
  /* Nome/Secondo nome/Cognome/Nota contatti NON sono piu' in Impostazioni (logica da sito personale): restano in _config.yml come ripiego.
     Titolo: vuoto = automatico dal baseurl (plugin _plugins/titolo_da_baseurl.rb); si salva come 'blank'. */
  var KEYS = [['title', 'Titolo'], ['description', 'Descrizione'], ['footer_text', 'Testo footer'], ['keywords', 'Parole chiave'],
    ['lang', 'Lingua (es. it)'], ['url', 'URL sito'], ['baseurl', 'Baseurl']];
  var CFG_SAVE = KEYS.concat([['toc_style', 'Indice articoli']]); // toc_style ha il suo <select> nella vista, non l'input generico
  var cfg = { sha: '', text: '' };
  function getVal(t, k) { // valore singola riga o blocco ">"
    var m = t.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm'));
    if (!m) return '';
    var v = m[1].replace(/\s+#.*$/, '').trim();
    if (v === '>' || v === '|' || v === '>-') {
      var rest = t.slice(t.indexOf(m[0]) + m[0].length + 1).split(/\r?\n/), out = [];
      for (var i = 0; i < rest.length; i++) { if (/^\s+\S/.test(rest[i])) out.push(rest[i].trim()); else if (rest[i].trim() === '') { if (out.length) out.push(''); } else break; }
      return out.join(' ').trim();
    }
    return v.replace(/^["']|["']$/g, '');
  }
  function setVal(t, k, v) {
    var re = new RegExp('^' + k + ':[ \\t]*(.*)$', 'm'), m = t.match(re);
    if (!m) return t;
    var start = t.indexOf(m[0]), end = start + m[0].length;
    if (/^(>|\||>-)/.test(m[1].trim())) { // sostituisce anche le righe indentate del blocco
      var lines = t.slice(end + 1).split(/\r?\n/), c = 0;
      while (c < lines.length && (/^\s+\S/.test(lines[c]) || lines[c].trim() === '' && c + 1 < lines.length && /^\s+\S/.test(lines[c + 1]))) c++;
      var tail = lines.slice(c).join('\n');
      return t.slice(0, start) + k + ': >\n  ' + v + '\n' + tail;
    }
    var cm = m[1].match(/(\s+#.*)$/);
    return t.slice(0, start) + k + ': ' + (/[:#]/.test(v) && !/^https?:/.test(v) ? '"' + v.replace(/"/g, '\\"') + '"' : v) + (cm ? cm[1] : '') + t.slice(end);
  }
  /* Righe per pagina del blog: nel config e' ANNIDATA (pagination > per_page), quindi non passa da getVal/setVal (solo chiavi in prima colonna).
     jekyll-paginate-v2 la legge da qui perche' _pages/blog.md NON ha piu' per_page (se ci torna, vince blog.md e questo menu non ha effetto). */
  var PER_RE = /(^pagination:[ \t]*\r?\n(?:[ \t]+[^\r\n]*\r?\n)*?[ \t]+per_page:[ \t]*)(\d+)/m;
  function getPer(t) { var q = t.match(PER_RE); return q ? q[2] : ''; }
  function setPer(t, n) { return t.replace(PER_RE, function (_q, a) { return a + n; }); }
  /* Copia a mano della regola del plugin _plugins/titolo_da_baseurl.rb (serve solo al segnaposto): tenerle uguali. */
  function autoTitle(t) {
    var s = getVal(t, 'baseurl').replace(/^\/+|\/+$/g, '').split('/').pop() || '';
    if (!s) { var m = getVal(t, 'url').match(/^https?:\/\/([^./]+)/); s = m ? m[1] : ''; }
    s = s.replace(/[-_]/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  A.views.settings = function () {
    return A.getFile('_config.yml').then(function (f) {
      cfg = { sha: f.sha, text: f.text };
      var h = '<h2>Impostazioni</h2><div class="card">';
      KEYS.forEach(function (k) {
        var v = getVal(f.text, k[0]), extra = '';
        if (k[0] === 'title') { // 'blank' = automatico: campo vuoto, il segnaposto mostra il titolo che ne esce
          var auto = autoTitle(f.text);
          if (v.toLowerCase() === 'blank') v = '';
          extra = ' placeholder="' + esc(auto) + '"';
        }
        h += '<label>' + k[1] + ' <small>(' + k[0] + ')</small></label><input id="c_' + k[0] + '" value="' + esc(v) + '"' + extra + '>';
        if (k[0] === 'title') h += '<small>Vuoto = automatico dal baseurl (vedi anteprima nel campo). Scrivi un testo per cambiarlo.</small>';
      });
      var ts = getVal(f.text, 'toc_style') === 'side' ? 'side' : 'box';
      h += '<label>Indice articoli <small>(toc_style)</small></label><select id="c_toc_style"><option value="box"' + (ts === 'box' ? ' selected' : '') + '>Cornice in alto</option><option value="side"' + (ts === 'side' ? ' selected' : '') + '>Laterale sinistro (su mobile va in alto)</option></select>';
      var pp = parseInt(getPer(f.text), 10) || 5, ppo = [5, 10, 20, 50, 100];
      if (ppo.indexOf(pp) < 0) { ppo.push(pp); ppo.sort(function (a, b) { return a - b; }); }
      h += '<label>Articoli per pagina nel blog <small>(pagination.per_page)</small></label><select id="c_per_page">' + ppo.map(function (o) { return '<option' + (o === pp ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
      h += '<p><button class="btn primary" onclick="A.cfgSave()">Salva</button></p><small>Attenzione: url e baseurl sbagliati rompono il sito. Modifica solo se sai cosa fai.</small></div>';
      M().innerHTML = h;
    });
  };
  A.cfgSave = A.wrap(function () {
    var t = cfg.text;
    CFG_SAVE.forEach(function (k) {
      var nv = $('c_' + k[0]).value.trim();
      if (k[0] === 'title' && !nv) nv = 'blank'; // vuoto = automatico dal baseurl
      if (nv !== getVal(cfg.text, k[0])) t = setVal(t, k[0], nv);
    });
    var npp = $('c_per_page').value; if (npp !== getPer(cfg.text)) t = setPer(t, npp);
    if (t === cfg.text) return A.toast('Nessuna modifica');
    return A.putFile('_config.yml', t, cfg.sha, 'admin: impostazioni').then(function () { A.toast('Salvato'); A.go('settings'); });
  });
})(A);
