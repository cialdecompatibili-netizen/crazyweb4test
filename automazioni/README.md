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
- `post.py` - articoli del blog in `_posts/`: `elenco`, `crea`, `campo`, `nascondi` / `mostra`, `testo`.
- `testi/` - file JSON con i testi delle pagine (uno per sito). Formato nel docstring di `pagine.py`.
- `__main__.py` - dispatcher dei moduli.

Esempi:

    python -m automazioni pagine testi --dry-run automazioni/testi/home_trasporticorp.json
    python -m automazioni pagine testi automazioni/testi/home_trasporticorp.json --push
    python -m automazioni menu figlio Agenzia --titolo "Prezzi" --permalink /prezzi/ --dry-run
    python -m automazioni footer fisso off --sito pannellisolari --push
    python -m automazioni post crea --titolo "Nuovo articolo" --categoria sample-posts --dry-run

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
