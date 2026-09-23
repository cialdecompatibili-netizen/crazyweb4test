# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Questo progetto (crazyweb4test)

- **Repo GitHub:** `cialdecompatibili-netizen/crazyweb4test` (ambiente di TEST). Produzione: repo `crazyweb4`.
- **Sito live:** https://cialdecompatibili-netizen.github.io/crazyweb4test/ (Pages, Source: GitHub Actions). Baseurl `/crazyweb4test`.
- **Cartella locale:** `C:\Users\mirco\Desktop\crazyweb4test_new` (nome provvisorio, da rinominare in `crazyweb4test_local`).
- **Origine:** copia di `crazyweb4` (locale in `C:\Users\mirco\Desktop\crazyweb4`), con solo `baseurl` cambiato. Non lavorare su `crazyweb4`.
- **Allineamento:** `powershell -File C:\Users\mirco\Desktop\clona_test.ps1` (fetch di crazyweb4, copia, baseurl, commit, push). Esclude `.git`, `node_modules`, `_site`, `.jekyll-cache`, `automazioni/` (contiene `.env`) e i file guida `CLAUDE.md`/`AGENTS.md`.
- **Contenuti del sito:** pagina `/servizi/` (9 sezioni, card senza link), menu Agenzia (Blog, Chi siamo, Servizi), sezione servizi in home.
- **Pubblicare servizi (SEMPRE con Python, output minimo):** `python pubblica_servizi.py <scelta> [--dove <repo da repos.json>|tutti] [--dry-run] [--push] [--conferma]`. Scelta = `--primi N` | `--slug a,b` | `--tutti`. Genera i post in `_posts` (via `genera_servizi.py` + `servizi_data.py`), rende cliccabili le card in `_pages/servizi.md` e `_pages/home.md` (link con `relative_url`, valido con qualsiasi baseurl), assicura il CSS card-intera per mobile, verifica i link rotti. `--push` fa add/commit/push SOLO dei file toccati e si ferma se il remoto e' inatteso o indietro. Idempotente. Default `--dove test`: `prod` (crazyweb4) SOLO dopo il via esplicito di Mirco. Non toccare a mano post/card: rilanciare lo script. Stato 23/09/2026: `servizi_data.py` ha tutti i 69 servizi; TEST: tutti i 69 post + card /servizi/ + card home pubblicati (commit 67e58f0), script reso dinamico via repos.json. PROD (crazyweb4): NON ancora fatto, attende il via di Mirco (poi: `python pubblica_servizi.py --tutti --dove prod --push`).
- **REGOLA RISPARMIO TOKEN (sempre):** ogni operazione ripetitiva o a piu' passaggi (generare/aggiornare file, copiare, controllare link, commit+push) va fatta con UNO script Python, non con tanti comandi a mano in chat. Flusso: 1) prima volta a mano per capire cosa serve, 2) quando funziona e' stabile lo si trasforma in script Python idempotente (`--dry-run` + `--push`, output di poche righe), 3) da li' in poi si usa SEMPRE lo script, mai piu' i passaggi manuali, 4) lo script si documenta qui in CLAUDE.md (comando, opzioni, regole). Non rileggere file grandi ne' stampare output lunghi: lo script stampa solo il riepilogo. Se lo script non copre un caso, si estende lo script, non si aggira.
- **Config dinamica (`repos.json`):** ZERO hardcoded negli script Python. Repo, cartelle, remoti, baseurl, pagine (`servizi_page`, `home_page`), permalink e classi CSS stanno TUTTI in `repos.json`. Nuovo repo = aggiungere un blocco in `repos.json` (`dir`, `remoto` owner/repo, `baseurl`, `etichetta`, `protetto`), MAI toccare il codice. Uso: `--dove <nome>` | `--dove a,b` | `--dove tutti`. Repo con `protetto: true` (prod) richiedono `--conferma` quando sono in un lancio multiplo, e si usano solo dopo il via di Mirco. Nuovi script: leggere sempre da `repos.json`, mai path/nomi/URL scritti nel codice.
- **REGOLA AGGIORNA-DOC (sempre):** appena qualcosa funziona (script testato, comando riuscito, fix confermato da Mirco) aggiornare SUBITO questo file con comando esatto, opzioni e stato, cosi' la volta dopo si riparte da qui. Se esiste gia' uno script Python che ha funzionato, USARE QUELLO (mai rifare a mano, mai riscriverlo da zero). Ogni script: idempotente, `--dry-run`, controlli prima di scrivere/pushare (remoto giusto, niente commit altrui, link non rotti), output di poche righe. Obiettivo: automatizzare il piu' possibile ed evitare rotture.
- **Backup vecchio:** `crazyweb4test_local_VECCHIA_backup` (stesso remote, NON pushare da lì): ha menu js-yaml, `SERVIZI.md`, `automazioni/` e 69 link ai post-servizio, da portare se servono.
`AGENTS.md` (imported above) is the **authoritative** agent entry point: change routing, the stop sign for gem-owned paths, the three silent failure modes, and the validated command set. Keep it short and ecosystem-neutral. Cross-repo architecture — the wrapper/tag/gem delegation table, feature gating, the v1 config contract, local overrides — lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); area-to-gem ownership lives in [`docs/BOUNDARIES.md`](docs/BOUNDARIES.md).

**Read those three before editing anything.** Everything below is Claude-specific or longer-form operational detail that does not belong in the short entry point. Do not restate facts from those files here — link to them.

## Daily dev loop

```bash
bundle install                                # ruby gems
bundle exec jekyll serve                      # dev server → http://localhost:4000/crazyweb4test/  (NOTE baseurl)
bundle exec jekyll build --baseurl /crazyweb4test  # production-style build to _site/
bash test/integration_distill.sh              # run ONE integration test (any of the seven in test/)
npm run test:visual:update                    # refresh playwright snapshots after intentional UI change
bundle exec al-folio upgrade apply --safe     # deterministic codemods (font-weight-* → font-*, remote→local URLs)
bundle exec al-folio upgrade overrides diff <path>    # then `overrides accept <path>` to acknowledge an override
```

## Optional toolchains

- **Jupyter posts.** `bin/setup-python-deps` installs _only_ `jupyter` and `nbconvert` (via `pip --user --break-system-packages`) for `jekyll-jupyter-notebook`. It does **not** read `requirements.txt`. Missing `jupyter-nbconvert` is warn-and-continue; notebook rendering is skipped.
- **Everything else Python.** [`requirements.txt`](requirements.txt) is the fuller list and must be installed separately (`python3 -m pip install -r requirements.txt`): `rendercv[full]` for CV rendering, `scholarly` for `bin/update_scholar_citations.py`, plus `nbconvert` and `pyyaml`.
- **Responsive images.** `imagemagick.enabled: true` needs ImageMagick `convert` on `PATH`.
- **Manual deploy.** `bin/deploy` is the manual `gh-pages` build + purgecss + force-push path; CI normally deploys. `purgecss` is not a devDependency — install it with `npm install -g purgecss`.

## Docker serving model (v1-specific)

`docker compose up -d` bind-mounts the repo to `/srv/jekyll` and runs `bin/entry_point.sh`, which serves with `--force_polling --destination /tmp/_site`. The build output deliberately goes to **container-local `/tmp/_site`, not the bind-mounted `_site`** — writing `_site` back across the host bind mount caused write deadlocks. The container also `inotifywait`s `_config.yml` and restarts Jekyll on change (config edits aren't hot-reloaded by `--watch`). Verify with the `/crazyweb4test` baseurl: `curl -fsS http://127.0.0.1:8080/crazyweb4test/`. `docker-compose-slim.yml` pulls a prebuilt `:slim` image instead of building locally.

## CI gates and the style contract

`npm run lint:style-contract` (`test/style_contract.js`) is the automated enforcement of the thin-starter boundary and will fail CI if you cross it. Beyond the forbidden paths listed in `AGENTS.md`, it also asserts that `_config.yml` keeps `theme: al_folio_core` and the required plugins, that the `third_party_libraries` SRI pins are present, and that the `al_math` Gemfile pin stays on a released version rather than a git branch.

Other gates:

- `unit-tests.yml` — style contract plus all seven `test/integration_*.sh` scripts (`comments`, `plugin_toggles`, `distill`, `bootstrap_compat`, `upgrade_cli`, `css_minify`, `new_plugins`).
- `visual-regression.yml` — Playwright on chromium + webkit, diffing the candidate build against a `v0.16.3` baseline worktree served on `:4100` via `BASELINE_URL`.
- `upgrade-check.yml` — `bundle exec al-folio upgrade audit`.
- `prettier.yml` — Prettier with `@shopify/prettier-plugin-liquid` and `printWidth: 150`. Run `npm run lint:prettier` before pushing; `npx prettier . --write` fixes.
- `update-tocs.yml` — regenerates `<!--ts-->…<!--te-->` blocks in changed root and `docs/` Markdown files. If you add or rename a heading, expect a follow-up auto-commit on `main`.

## Gem version pins

`Gemfile` pins every `al-*` gem to an exact released version in `group :al_folio_plugins`, and `_config.yml` lists the same gems under `plugins:`. Read the current pins from the `Gemfile` rather than trusting any version quoted in prose — including here. To test a gem fix against this site, repoint the `Gemfile` at a sibling checkout (`path:`, `git:`, or `branch:`) and `bundle install`; see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#working-on-a-gem-alongside-the-starter). Revert the pin before committing.
