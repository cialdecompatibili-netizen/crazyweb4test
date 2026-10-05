# automazioni/

Script Python organizzati per gestire il sito crazyweb4test (repo
`cialdecompatibili-netizen/crazyweb4test`) senza dover riscrivere ogni volta
chiamate GitHub API sparse o script usa-e-getta come in claudetemp/.

Questa cartella vive DENTRO il repo del sito, ma è codice di gestione, non
codice del sito: non tocca _layouts/, _includes/, _sass/ (vietati da
AGENTS.md, vedi "Stop sign"). Se un task richiede di toccare quei path, lo
si fa a mano/via GitHub API con edit_block come finora, seguendo le regole
di AGENTS.md — questi script servono solo per i task ripetibili.

## Struttura

Si lancia dalla cartella del sito: `python -m automazioni <modulo> <comando> [opzioni]`
(`python -m automazioni` senza argomenti elenca i moduli; `-h` dopo ogni comando mostra le opzioni).

Opzioni comuni a TUTTI i comandi che scrivono: `--sito <cartella>` (default: questo sito; accetta anche il nome
di una cartella accanto, es. `trasporticorp`), `--dry-run` (mostra, non scrive), `--push` (commit + pull --rebase
+ push), `--conferma` (obbligatorio sui repo protetti, prod). Sono idempotenti: rilanciati non fanno danni.

- `common/sito.py` - base comune: trova il sito, legge/scrive in binario (CRLF preservati, niente BOM),
  front matter e righe, checkpoint `checkpoint-AAAA-MM-GG`, commit/push. Tutti i moduli usano questa.
- `common/config.py`, `common/github_api.py` - costanti e chiamate GitHub API (usate dagli script che lavorano via API).
- `menu.py` - menu di navigazione: `elenco`, `voce` (nav/ordine/titolo di una pagina), `figlio` / `rimuovi-figlio`
  (voci nelle tendine, con `--divider`), `link-aggiungi` / `link-rimuovi` (voci-link esterne).
- `pagine.py` - front matter e testi delle pagine: `elenco`, `leggi`, `imposta` (campi del front matter) e
  `testi <file.json>` (cambia SOLO le righe indicate di una pagina). I testi delle home dei cloni stanno in
  `testi/home_<sito>.json` (dati, non codice): per un clone nuovo si copia un JSON e si cambiano i testi.
- `footer.py` - footer del sito: `leggi`, `testo`, `fisso on|off`, `aggiornamento on|off`, `note-legali`.
- `config_sito.py` - `_config.yml`: `leggi`, `imposta chiave=valore` (titolo, lingua, favicon, articoli per pagina, ...).
- `common/collezione.py` - MOTORE CONDIVISO delle raccolte di contenuti: implementa una volta sola `elenco`, `crea`,
  `campo`, `nascondi` / `mostra`, `testo`, `elimina` (senza `--si` mostra solo l'anteprima). Ogni raccolta e' un file
  da ~25-50 righe che passa SOLO la configurazione (cartella, layout, campi, front matter): niente copia-incolla.
- `post.py` - articoli del blog in `_posts/` (usa il motore). `crea --titolo ... --categoria ... [--thumbnail]`.
- `progetti.py` - progetti del portfolio in `_projects/` (usa il motore). `crea --titolo ... [--img] [--importanza] [--in-home]`.
- `news.py` - annunci brevi in `_news/` (usa il motore, senza titolo). `crea --testo "..."`.
- `servizi.py` - SOLO `elenco` dei servizi in `_servizi/`: si pubblicano con `pubblica_servizi.py` (CLAUDE.md).
- `testi/` - file JSON con i testi delle pagine (uno per sito). Formato nel docstring di `pagine.py`.
- `__main__.py` - dispatcher dei moduli.

Esempi:

    python -m automazioni pagine testi --dry-run automazioni/testi/home_trasporticorp.json
    python -m automazioni pagine testi automazioni/testi/home_trasporticorp.json --push
    python -m automazioni menu figlio Agenzia --titolo "Prezzi" --permalink /prezzi/ --dry-run
    python -m automazioni footer fisso off --sito pannellisolari --push
    python -m automazioni post crea --titolo "Nuovo articolo" --categoria sample-posts --dry-run
    python -m automazioni progetti crea --titolo "Nuovo progetto" --in-home --testo-file corpo.md --dry-run
    python -m automazioni news crea --testo "Nuovo annuncio" --dry-run
    python -m automazioni progetti elimina nuovo-progetto --si --push

Limite: non toccano `_layouts/`, `_includes/`, `_sass/` (vietati da AGENTS.md, vedi "Stop sign"); il footer si
modifica solo tramite le chiavi di `_config.yml` che il tema gia' legge.

## Regola per ogni nuovo script

Ogni script deve avere in testa un docstring con:
1. Cosa fa
2. Su quale file/path del repo agisce
3. Se lavora in locale, via GitHub API, o entrambi
4. Data e riferimento alla richiesta che lo ha originato

Quando si aggiunge un modulo nuovo, aggiornare anche questo README con una
riga nella lista sopra.

Per una RACCOLTA nuova (cartella di .md con front matter) non scrivere codice nuovo: copiare `news.py` (la piu' corta),
cambiare `cartella`, il front matter in `_front_matter()` e le opzioni, aggiungerla a `MODULI` in `__main__.py`.
Il codice che serve a piu' moduli va SEMPRE in `common/` (mai copiato): regola per risparmiare token e righe. I PUNTI CRITICI (cosa rompe il sito se sbagli) sono commentati nel codice con `# CRITICO:` accanto alla riga che li protegge: prima di modificare un modulo, `Get-ChildItem automazioni -Recurse -Include *.py | Select-String CRITICO`; quando scopri un nuovo punto critico, aggiungi il commento nel codice, non solo qui.

## Cosa manca ancora (controllo del 06/10/2026)

Confronto tra l'admin (`admin/*.js`) e i moduli di questa cartella. Fatto leggendo il codice, NON provando i comandi
sui siti: prima di fidarsi di un modulo, lanciarlo con `--dry-run`.

Da fare, in ordine di priorita':
1. `pagine crea` / `elimina` / `duplica`: oggi `pagine.py` modifica solo pagine che esistono gia' in `_pages/`.
2. Servizi (`_servizi/`): `servizi.py` fa solo `elenco`; crea/modifica/elimina di un singolo servizio non c'e'
   (si pubblicano da `servizi_data.py` con `pubblica_servizi.py`, che tocca anche menu e card).
   FATTI il 06/10/2026 con il motore condiviso: progetti, news (e post spostato sul motore).
3. Categorie e tag (`admin-categories.js`): rinomina, unisci, elimina.
4. Media e gallerie (`admin-media.js`, `admin-gallerie.js`): caricare, eliminare, cercare immagini non usate.
5. Tema e colori (`admin-tema.js`).
6. Moduli attivabili e gruppi (`admin-modules.js`, `admin-gruppi.js`).
7. Cestino e backup (`admin-cestino.js`, `admin-backup.js`).
8. Azioni su tanti elementi insieme (`admin-bulk.js`).

Da verificare (non controllato): `_teachings/`, `_books/`, `_bibliography/` e i dati in `_data/` (es. menu, social).
Esistono come cartelle del tema ma non so se il sito li usa: se non servono, non fare moduli.

Prima di aggiungere un modulo seguire "Regola per ogni nuovo script" qui sopra e togliere la voce da questa lista.
