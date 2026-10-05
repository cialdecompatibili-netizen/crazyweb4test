# -*- coding: utf-8 -*-
"""
servizi.py - elenco dei servizi (_servizi/), SOLO LETTURA.

1. Cosa fa: mostra i servizi del sito (data, gruppo, titolo, slug) con il motore condiviso common/collezione.py.
2. Su quale file agisce: legge _servizi/*.md. NON scrive: i servizi si pubblicano SOLO con
   `python pubblica_servizi.py` (CLAUDE.md), che li genera dai dati.
3. Lavora in locale, non modifica nulla.
4. Origine: richiesta del 06/10/2026.

Uso:
  python -m automazioni.servizi elenco [--sito percorso] [--categoria "Sviluppo web"]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import collezione  # noqa: E402

CFG = dict(nome="servizi", descr=__doc__.split("\n")[1], cartella="_servizi", layout="servizio",
           costruisci=None, categoria="gruppo", solo_lettura=True)


def main(argv=None):
    collezione.main(CFG, argv)


if __name__ == "__main__":
    main()
