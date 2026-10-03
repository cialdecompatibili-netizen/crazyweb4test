/* Immagini (assets/img/) + Impostazioni (_config.yml). Vedi claude.md */
(function (A) {
  var $ = A.$, esc = A.esc, M = function () { return A.main(); };
  var IMG = /\.(jpe?g|png|gif|webp|svg)$/i;

  A.views.media = function () {
    return A.getDir('assets/img', { rest: true }).then(function (l) {
      var files = l.filter(function (f) { return f.type === 'file' && IMG.test(f.name); });
      var h = '<h2>Immagini</h2><div class="card"><input id="up" type="file" accept="image/*" multiple>' +
        '<p><button class="btn primary" onclick="A.upload()">Carica</button> <small>Vanno in assets/img/. Usa nei contenuti: assets/img/nome.jpg</small></p></div><div class="card"><div class="grid">';
      files.forEach(function (f) {
        h += '<div class="im"><img loading="lazy" src="' + esc(f.download_url) + '"><div>' + esc(f.name) + '</div>' +
          '<button class="btn sm" onclick="A.copyImg(\'' + A.jq(f.name) + '\')">Copia</button>' +
          '<button class="btn sm danger" onclick="A.delImg(\'' + A.jq(f.name) + '\')">x</button></div>';
      });
      M().innerHTML = h + '</div>' + (files.length ? '' : 'Nessuna immagine.') + '</div>';
    });
  };
  /* SELETTORE IMMAGINE (stile WordPress): finestra con Carica + griglia di assets/img. Clic su una foto = selezionata, 'Imposta immagine' la scrive nel campo
     nascosto <fid> (percorso 'assets/img/nome.jpg') e aggiorna l'anteprima. Le foto caricate da qui sono ridotte nel browser (max 2000 px, qualita' 0.85, come le
     gallerie) e NON sovrascrivono mai un file con lo stesso nome (si aggiunge -2, -3...). Si seleziona da sola l'ultima caricata. Usato da articoli (thumbnail) e progetti (img). */
  A.rawUrl = function (p) { return /^https?:/.test(p) ? p : 'https://raw.githubusercontent.com/' + A.repo() + '/' + A.branch() + '/' + String(p).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/'); };
  A.imgPrev = function (fid) {
    var v = ($(fid).value || '').trim(), e = $(fid + '_pv'); if (!e) return;
    e.innerHTML = v ? '<img src="' + esc(A.rawUrl(v)) + '" style="max-width:240px;max-height:150px;border-radius:4px;border:1px solid #a7aaad;display:block;margin:6px 0"><small>' + esc(v) + '</small>' : '<small>Nessuna immagine impostata</small>';
  };
  A.imgClr = function (fid) { $(fid).value = ''; A.imgPrev(fid); };
  function shrink(f) {
    return new Promise(function (ok, ko) {
      function rd(b) { var r = new FileReader(); r.onload = function () { ok(r.result.split(',')[1]); }; r.onerror = ko; r.readAsDataURL(b); }
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return rd(f);
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(u);
        var s = Math.min(1, 2000 / Math.max(im.naturalWidth, im.naturalHeight));
        if (s === 1 && f.size < 1500000) return rd(f);
        var cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * s); cv.height = Math.round(im.naturalHeight * s);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        cv.toBlob(function (bl) { rd(bl || f); }, f.type, 0.85);
      };
      im.onerror = function () { URL.revokeObjectURL(u); rd(f); };
      im.src = u;
    });
  }
  A.imgPick = function (fid) {
    if ($('ip_ov')) return;
    var sel = ($(fid).value || '').trim(), names = [];
    var ov = document.createElement('div'); ov.id = 'ip_ov';
    ov.style.cssText = 'position:fixed;inset:0;background:#0008;z-index:60;display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML = '<div style="background:#fff;border-radius:6px;width:100%;max-width:880px;max-height:92vh;display:flex;flex-direction:column">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #ddd"><b>Scegli o carica un\'immagine</b><button class="btn sm" id="ip_x">Chiudi</button></div>' +
      '<div style="padding:12px 16px;border-bottom:1px solid #ddd"><input type="file" id="ip_f" accept="image/*" multiple style="width:auto"> <small id="ip_s">Carica una foto dal PC: viene ridotta, salvata in assets/img e selezionata.</small></div>' +
      '<div id="ip_g" class="grid" style="padding:16px;overflow:auto;flex:1;align-content:start"></div>' +
      '<div style="padding:12px 16px;border-top:1px solid #ddd;text-align:right"><button class="btn primary" id="ip_ok">Imposta immagine</button></div></div>';
    document.body.appendChild(ov);
    function close() { ov.remove(); }
    function paint() {
      Array.prototype.forEach.call($('ip_g').querySelectorAll('.im'), function (e) { e.style.outline = e.getAttribute('data-p') === sel ? '3px solid #2271b1' : ''; });
    }
    function draw() {
      return A.getDir('assets/img', { rest: true }).then(function (l) {
        var fs = l.filter(function (f) { return f.type === 'file' && IMG.test(f.name); }); names = fs.map(function (f) { return f.name; });
        $('ip_g').innerHTML = fs.length ? fs.map(function (f) {
          return '<div class="im" style="cursor:pointer" data-p="assets/img/' + esc(f.name) + '"><img loading="lazy" src="' + esc(f.download_url) + '"><div>' + esc(f.name) + '</div></div>';
        }).join('') : 'Nessuna immagine: caricane una.';
        paint();
      }, function (e) { $('ip_g').textContent = A.errMsg(e); });
    }
    ov.addEventListener('click', function (e) {
      if (e.target === ov) return close();
      var t = e.target; while (t && t !== ov && !(t.getAttribute && t.getAttribute('data-p'))) t = t.parentNode;
      if (t && t !== ov) { sel = t.getAttribute('data-p'); paint(); }
    });
    $('ip_x').onclick = close;
    $('ip_ok').onclick = function () { if (!sel) return A.toast('Scegli o carica un\'immagine', true); $(fid).value = sel; A.imgPrev(fid); close(); };
    $('ip_f').onchange = function () {
      var fs = Array.prototype.slice.call(this.files); if (!fs.length) return;
      var inp = this, st = $('ip_s');
      fs.reduce(function (pr, f, i) {
        return pr.then(function () {
          st.textContent = 'Carico ' + (i + 1) + ' di ' + fs.length + '...';
          return shrink(f).then(function (b64) {
            var name = f.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'), m = name.match(/^(.*?)(\.[a-z0-9]+)?$/), k = 1;
            while (names.indexOf(name) >= 0) { k++; name = m[1] + '-' + k + (m[2] || ''); }
            return A.putFile('assets/img/' + name, b64, '', 'admin: immagine ' + name, true).then(function () { names.push(name); sel = 'assets/img/' + name; });
          });
        });
      }, Promise.resolve()).then(function () { st.textContent = 'Caricata e selezionata.'; inp.value = ''; return draw(); },
        function (e) { st.textContent = 'Errore: ' + A.errMsg(e); });
    };
    draw();
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
  /* Come WordPress: solo cio' che serve. Titolo, Descrizione (ripiego SEO), Lingua; poi Lettura (articoli per pagina, indice).
     NON in admin (restano in _config.yml): nome/cognome/nota contatti (logica da sito personale), parole chiave (i motori le ignorano),
     testo footer, url e baseurl (li ricava deploy.yml dal repo: un clone funziona da solo, vedi CLAUDE.md).
     Titolo: vuoto = automatico dal nome del repo/baseurl (plugin _plugins/titolo_da_baseurl.rb); si salva come 'blank'. */
  var KEYS = [['title', 'Titolo'], ['description', 'Descrizione per i motori di ricerca (ripiego)'], ['lang', 'Lingua']];
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
  /* Copia a mano della regola del plugin _plugins/titolo_da_baseurl.rb (serve solo al segnaposto): tenerle uguali.
     Il nome viene dall'indirizzo del sito (utente.github.io/<repo>/), che e' quello che usa il deploy; ripiego: baseurl del config. */
  function autoTitle(t) {
    var pm = location.pathname.match(/^\/([^\/]+)\//), s = (/\.github\.io$/i.test(location.hostname) && pm && pm[1] !== 'admin') ? pm[1] : '';
    if (!s) s = getVal(t, 'baseurl').replace(/^\/+|\/+$/g, '').split('/').pop() || '';
    if (!s) { var m = getVal(t, 'url').match(/^https?:\/\/([^./]+)/); s = m ? m[1] : ''; }
    s = s.replace(/[-_]/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }
  /* BOX TOKEN (Impostazioni): mostra il token salvato nel browser per poterlo copiare (es. per dare la gestione a un'altra persona).
     PUNTI CRITICI: (1) il campo e' type=password (pallini) e diventa testo solo col clic sull'occhio; l'occhio, quando MOSTRA, copia anche da solo.
     (2) il valore sta solo nel DOM di questa pagina, mai in localStorage a parte (c'e' gia' la chiave adm_tok:<percorso> del login) ne' nel repo.
     (3) chi ha il token puo' scrivere sul repo: per un amico meglio un token suo, da revocare su GitHub quando non serve piu'.
     (4) navigator.clipboard funziona solo in https (GitHub Pages lo e'); in caso contrario si ripiega su select + execCommand('copy'). */
  A.tokBox = function () {
    return '<div class="card"><h3>Token di accesso</h3>' +
      '<p style="margin:0 0 8px;color:#787c82">Il token salvato in questo browser. Con l\'occhio lo vedi e lo copia da solo; con Copia lo copi senza mostrarlo.</p>' +
      '<div style="display:flex;gap:8px;align-items:center"><input id="tokBox" type="password" readonly autocomplete="off" value="' + esc(A.token()) + '" style="flex:1;min-width:0">' +
      '<button class="btn" id="tokEye" title="Mostra e copia" onclick="A.tokEye()">&#128065;</button>' +
      '<button class="btn primary" onclick="A.tokCopy()">Copia</button></div>' +
      '<small style="color:#787c82">Chi ha il token pu\u00f2 modificare questo repo. Se non ti serve pi\u00f9, revocalo da GitHub (Settings &gt; Developer settings).</small></div>';
  };
  A.tokCopy = function () {
    var el = document.getElementById('tokBox'); if (!el) return;
    function ok() { A.toast('Token copiato'); }
    function fb() {
      var was = el.type; el.type = 'text'; el.select();
      var done = false; try { done = document.execCommand('copy'); } catch (e) {}
      el.type = was; if (window.getSelection) window.getSelection().removeAllRanges();
      if (done) ok(); else A.toast('Copia non riuscita: mostra il token e copialo a mano', true);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(A.token()).then(ok, fb); else fb();
  };
  A.tokEye = function () {
    var el = document.getElementById('tokBox'); if (!el) return;
    var show = el.type === 'password'; el.type = show ? 'text' : 'password';
    if (show) A.tokCopy();
  };
  A.views.settings = function () {
    return A.getFile('_config.yml').then(function (f) {
      cfg = { sha: f.sha, text: f.text };
      var h = '<h2>Impostazioni</h2><div class="card"><h3>Generali</h3>';
      KEYS.forEach(function (k) {
        var v = getVal(f.text, k[0]), extra = '';
        if (k[0] === 'lang') { // tendina invece del campo libero
          var LG = [['it', 'Italiano'], ['en', 'English'], ['fr', 'Fran\u00e7ais'], ['de', 'Deutsch'], ['es', 'Espa\u00f1ol']];
          if (!LG.some(function (x) { return x[0] === v; }) && v) LG.push([v, v]);
          h += '<label>' + k[1] + '</label><select id="c_lang">' + LG.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>';
          return;
        }
        if (k[0] === 'title') { // 'blank' = automatico: campo vuoto, il segnaposto mostra il titolo che ne esce
          var auto = autoTitle(f.text);
          if (v.toLowerCase() === 'blank') v = '';
          extra = ' placeholder="' + esc(auto) + '"';
        }
        h += '<label>' + k[1] + '</label><input id="c_' + k[0] + '" value="' + esc(v) + '"' + extra + '>';
        if (k[0] === 'description') h += '<small>Non compare nel sito. La usano Google e le anteprime sui social solo per le pagine senza una descrizione propria.</small>';
        if (k[0] === 'title') h += '<small>Vuoto = automatico dal nome del sito (vedi anteprima nel campo). Scrivi un testo per cambiarlo.</small>';
      });
      h += '<h3>Lettura</h3>';
      var ts = getVal(f.text, 'toc_style') === 'side' ? 'side' : 'box';
      h += '<label>Indice articoli</label><select id="c_toc_style"><option value="box"' + (ts === 'box' ? ' selected' : '') + '>Cornice in alto</option><option value="side"' + (ts === 'side' ? ' selected' : '') + '>Laterale sinistro (su mobile va in alto)</option></select>';
      var pp = parseInt(getPer(f.text), 10) || 5, ppo = [5, 10, 20, 50, 100];
      if (ppo.indexOf(pp) < 0) { ppo.push(pp); ppo.sort(function (a, b) { return a - b; }); }
      h += '<label>Articoli per pagina nel blog</label><select id="c_per_page">' + ppo.map(function (o) { return '<option' + (o === pp ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>';
      h += '<p><button class="btn primary" onclick="A.cfgSave()">Salva</button></p></div>';
      M().innerHTML = h + A.tokBox();
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
