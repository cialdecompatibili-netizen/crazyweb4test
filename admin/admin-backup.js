/* Backup: copie dello stato del sito, come branch "backup-..." su GitHub, con ripristino. Vedi CLAUDE.md > Backup.
   Un backup = un branch che punta al commit attuale (2 chiamate API, istantaneo, nessuna copia di file).
   Ripristino = NUOVO commit sopra main con i file (tree) del backup, aggiornamento SENZA force: la cronologia non si perde e se nel
   frattempo main e' cambiato GitHub rifiuta e non si sovrascrive niente. Prima del ripristino si crea in automatico un backup dello
   stato attuale (nome ...-pre-ripristino), cosi' anche il ripristino si puo' annullare.
   PUNTI CRITICI: (1) mai force:true sull'aggiornamento di main. (2) il ripristino annulla TUTTO quello che e' stato fatto dopo il backup,
   anche gli articoli scritti dall'admin. (3) se il backup differisce dallo stato attuale nei file di .github/workflows GitHub puo' rifiutare
   senza il permesso "workflow" sul token: l'errore viene mostrato com'e'. (4) dopo il ripristino il sito si ricostruisce (2-3 minuti).
   (5) non c'e' ancora l'eliminazione dei backup: si cancellano a mano come branch su GitHub. */
(function (A) {
  var esc = A.esc, M = function () { return A.main(); };
  var BRN = 'main', LIST = [];
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() { var d = new Date(); return 'backup-' + d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()); }
  function headSha() { return A.api('GET', '/git/ref/heads/' + BRN).then(function (r) { return r.object.sha; }); }

  A.views.backup = function () {
    return A.api('GET', '').then(function (repo) {
      BRN = repo.default_branch || 'main';
      return Promise.all([headSha(), A.api('GET', '/git/matching-refs/heads/backup-?per_page=100')]);
    }).then(function (rs) {
      var head = rs[0];
      LIST = rs[1].map(function (r) { return { name: r.ref.replace('refs/heads/', ''), sha: r.object.sha }; })
        .sort(function (a, b) { return a.name < b.name ? 1 : -1; });
      var rows = LIST.map(function (b, i) {
        var same = b.sha === head;
        return '<div class="it"><span>' + esc(b.name) + '<small>' + esc(b.sha.slice(0, 7)) + (same ? ' \u00b7 identico allo stato attuale' : '') + '</small></span>' +
          (same ? '' : '<button class="btn sm danger" onclick="A.bkRestore(' + i + ')">Ripristina</button>') + '</div>';
      }).join('');
      M().innerHTML = '<h2>Backup <button class="btn primary sm" onclick="A.bkNew()">+ Crea backup ora</button></h2>' +
        '<div class="card"><p style="margin:0 0 12px;color:#787c82">Un backup \u00e8 una copia dello stato attuale del sito (un branch <code>backup-\u2026</code> su GitHub). ' +
        'Ripristinare riporta tutti i file a quella copia con un nuovo commit: la cronologia non si perde e prima viene creato in automatico un backup dello stato attuale.</p>' +
        '<div class="list">' + (rows || 'Nessun backup.') + '</div></div>';
    });
  };

  A.bkNew = A.wrap(function () {
    var nm = stamp();
    return headSha().then(function (sha) { return A.api('POST', '/git/refs', { ref: 'refs/heads/' + nm, sha: sha }); })
      .then(function () { A.toast('Backup creato: ' + nm); A.go('backup'); })
      .catch(function (e) {
        if (e.status === 422) { A.toast('Esiste gi\u00e0 un backup di questo minuto (' + nm + ')', true); return; }
        throw e;
      });
  });

  A.bkRestore = A.wrap(function (i) {
    var b = LIST[i]; if (!b) return;
    var head, pre = stamp() + '-pre-ripristino';
    return headSha().then(function (h) {
      head = h;
      if (b.sha === head) { A.toast('Il backup \u00e8 identico allo stato attuale: niente da ripristinare'); return null; }
      return A.api('GET', '/compare/' + b.sha + '...' + head).then(function (c) { return c.ahead_by; }, function () { return null; }).then(function (ahead) {
        var msg = 'Ripristinare "' + b.name + '"?\n\n' + (ahead != null ? 'Verranno annullati ' + ahead + ' commit fatti dopo questo backup (articoli, modifiche, foto).\n' : 'Verr\u00e0 annullato tutto quello fatto dopo questo backup.\n') +
          'Prima viene creato un backup dello stato attuale (' + pre + '), cos\u00ec puoi tornare indietro.';
        if (!confirm(msg)) return null;
        return A.api('POST', '/git/refs', { ref: 'refs/heads/' + pre, sha: head })
          .then(function () { return A.api('GET', '/git/commits/' + b.sha); })
          .then(function (c) { return A.api('POST', '/git/commits', { message: 'admin: ripristina ' + b.name, tree: c.tree.sha, parents: [head] }); })
          .then(function (nc) { return A.api('PATCH', '/git/refs/heads/' + BRN, { sha: nc.sha, force: false }); })
          .then(function () { A.LST = {}; A.toast('Ripristinato ' + b.name + ': il sito si aggiorna tra 2-3 minuti'); A.go('backup'); });
      });
    }).catch(function (e) {
      A.toast('Non ripristinato: ' + (e.message || e.status) + '. Il sito non \u00e8 stato modificato.', true);
    });
  });
})(A);
