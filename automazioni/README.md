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

- `common/github_api.py` — helper condivisi per leggere/scrivere file sul
  repo GitHub (get contents, create_or_update, get sha corrente). Ogni
  script sotto usa questo, non richieste dirette duplicate.
- `common/config.py` — costanti: owner, repo, branch di default.
- `menu.py` — gestione voci del menu di navigazione (_data o _config.yml,
  da verificare dove al-folio lo definisce).
- `contenuto_pagine.py` — editing contenuto pagine in _pages/.
- `footer.py` — editing _includes/footer.liquid (override locale già
  esistente, es. stile #table-of-contents modificato il 22/09/2026).
- `post.py` — wrapper su genera_servizi.py per creare/aggiornare post di
  servizio in _posts/ mantenendo lo stile già validato (3-4 H2, niente
  sezione "Richiedi una consulenza", vedi commit e4b9b12).

## Regola per ogni nuovo script

Ogni script deve avere in testa un docstring con:
1. Cosa fa
2. Su quale file/path del repo agisce
3. Se lavora in locale, via GitHub API, o entrambi
4. Data e riferimento alla richiesta che lo ha originato

Quando si aggiunge un modulo nuovo, aggiornare anche questo README con una
riga nella lista sopra.
