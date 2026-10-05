#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aggiorna SOLO il testo della home (_pages/home.md) di trasporticorp, pannellisolari, mobilitaelettrica.
Dati richiesti dalla regola di automazioni/README.md:
1. Cosa fa: sostituisce 6 righe di testo della home nei cloni di nicchia.
2. Agisce su: _pages/home.md di ogni cartella sul Desktop (trasporticorp, pannellisolari, mobilitaelettrica).
3. Lavora in locale (file + git), non via GitHub API.
4. Origine: richiesta del 05/10/2026 (testi home dei 3 cloni ispirati ai competitor).
LIMITE: cerca le righe dall'inizio del vecchio testo della web agency ('Comunicazione, web marketing',
'Un team unico di professionisti', 'Vuoi far crescere il tuo business?'). Sui cloni gia' aggiornati va
adattato; per un clone nuovo aggiungere il sito al dizionario SITI con i suoi testi.

Cosa cambia (6 righe per sito): seo_title, seo_description, titolo h2, 2 paragrafi, riga bold finale.
Cosa NON tocca: CSS, JS, Marte, cicli Liquid dei servizi/progetti, front matter restante.
Modifica in binario preservando gli a-capo CRLF (CLAUDE.md punto 11), assert su ogni riga.

Uso:
  python aggiorna_home_nicchie.py --dry-run            # mostra cosa cambierebbe, non scrive
  python aggiorna_home_nicchie.py                      # checkpoint + scrive i file (niente commit)
  python aggiorna_home_nicchie.py --push               # come sopra + commit + pull --rebase + push
  opzioni: --solo trasporticorp,pannellisolari  --base <cartella Desktop>
"""
import argparse, datetime, pathlib, subprocess, sys

BASE = pathlib.Path(r"C:\Users\mirco\Desktop")
SEO_T = 'seo_title: '
SEO_D = 'seo_description: '
H2 = '## '
P1 = 'Comunicazione, web marketing'
P2 = 'Un team unico di professionisti'
CTA = '**Vuoi far crescere il tuo business?**'

SITI = {
  'trasporticorp': {
    SEO_T: 'seo_title: "{title} | Trasporti merci su strada"',
    SEO_D: 'seo_description: "Trasporti merci su strada con camion e autisti esperti: carichi completi e parziali, consegne puntuali, preventivo gratuito e risposta entro 24 ore."',
    H2: "## Trasporti su strada puntuali, per merci che non possono aspettare.",
    P1: "Mettiamo a disposizione camion e autisti esperti per spostare le tue merci da un punto all'altro, con tempi chiari e consegne affidabili. Che si tratti di un carico completo, di un collettame o di una consegna urgente, organizziamo il viaggio intorno al tuo carico e alle tue scadenze.",
    P2: "Un unico referente segue ogni trasporto, dal ritiro alla consegna, e ti tiene aggiornato lungo il percorso. Rispondiamo entro 24 ore, festivi esclusi, e il preventivo è gratuito e senza impegno.",
    CTA: "**Hai una merce da spedire?** Scrivici su WhatsApp o richiedi un preventivo: ti proponiamo il mezzo e il prezzo giusti per il tuo carico.",
  },
  'pannellisolari': {
    SEO_T: 'seo_title: "{title} | Impianti fotovoltaici"',
    SEO_D: 'seo_description: "Impianti fotovoltaici chiavi in mano per casa e azienda: sopralluogo e preventivo gratuiti, progetto, installazione, accumulo e pratiche per gli incentivi. Risposta entro 24 ore."',
    H2: "## Energia solare per la tua casa e la tua azienda, dal progetto all'attivazione.",
    P1: "Progettiamo e installiamo impianti fotovoltaici su misura, con pannelli, inverter e sistemi di accumulo scelti in base ai tuoi consumi, al tetto e al budget. L'obiettivo è farti produrre l'energia che usi davvero, per ridurre la bolletta e dipendere meno dalla rete.",
    P2: "Con la formula chiavi in mano ti seguiamo in ogni fase: sopralluogo, progetto, installazione, collegamento alla rete e pratiche per gli incentivi disponibili. Rispondiamo entro 24 ore, festivi esclusi, e il sopralluogo con preventivo è gratuito.",
    CTA: "**Vuoi sapere quanto puoi risparmiare?** Scrivici su WhatsApp o richiedi un preventivo: valutiamo insieme la soluzione giusta per il tuo tetto.",
  },
  'mobilitaelettrica': {
    SEO_T: 'seo_title: "{title} | Ricarica auto elettriche"',
    SEO_D: 'seo_description: "Wallbox e colonnine di ricarica per auto elettriche a casa, in condominio e in azienda: consulenza, installazione certificata e preventivo gratuito. Risposta entro 24 ore."',
    H2: "## La ricarica per la tua auto elettrica, a casa, in condominio e in azienda.",
    P1: "Ti aiutiamo a scegliere e installare la soluzione di ricarica più adatta: wallbox domestiche, punti di ricarica per condomini e colonnine per aziende, hotel e parcheggi. Partiamo dalla tua auto, dal contatore e dall'uso che ne fai, così la potenza giusta costa il giusto, senza sprechi.",
    P2: "Pensiamo noi alla parte tecnica e burocratica: sopralluogo, progetto elettrico, installazione a regola d'arte con dichiarazione di conformità e, quando serve, supporto per le pratiche condominiali e per gli incentivi. Rispondiamo entro 24 ore, festivi esclusi, e il preventivo è gratuito.",
    CTA: "**Stai per passare all'elettrico?** Scrivici su WhatsApp o richiedi un preventivo: troviamo insieme la ricarica giusta per te.",
  },
}
# prefisso della riga da sostituire
PREFISSI = [SEO_T, SEO_D, H2, P1, P2, CTA]


def sostituisci(data: bytes, nuovo: dict):
    """Ritorna (nuovo_data, elenco_modifiche). Righe sostituite per prefisso, 'a-capo' (\\r) preservato."""
    righe = data.split(b'\n')
    mod = []
    for pref in PREFISSI:
        pb = pref.encode('utf-8')
        idx = [i for i, r in enumerate(righe) if r.startswith(pb)]
        assert len(idx) == 1, f"prefisso {pref!r}: trovate {len(idx)} righe (atteso 1)"
        i = idx[0]
        cr = b'\r' if righe[i].endswith(b'\r') else b''
        righe[i] = nuovo[pref].encode('utf-8') + cr
        mod.append(pref.strip())
    return b'\n'.join(righe), mod


def git(cartella, *args):
    return subprocess.run(['git', '-C', str(cartella), *args], capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--push', action='store_true')
    ap.add_argument('--solo', default='')
    ap.add_argument('--base', default=str(BASE))
    a = ap.parse_args()
    base = pathlib.Path(a.base)
    scelti = [s for s in a.solo.split(',') if s] or list(SITI)
    oggi = datetime.date.today().isoformat()
    for nome in scelti:
        cart = base / nome
        f = cart / '_pages' / 'home.md'
        if nome not in SITI or not f.exists():
            print(f"[{nome}] SALTATO: sito sconosciuto o home.md mancante"); continue
        data = f.read_bytes()
        assert not data.startswith(b'\xef\xbb\xbf'), "BOM nel file: non va aggiunto"
        nuovo, mod = sostituisci(data, SITI[nome])
        crlf_prima, crlf_dopo = data.count(b'\r\n'), nuovo.count(b'\r\n')
        assert crlf_prima == crlf_dopo, "a-capo cambiati: stop"
        if nuovo == data:
            print(f"[{nome}] gia' aggiornato"); continue
        if a.dry_run:
            print(f"[{nome}] DRY-RUN ok: {len(mod)} righe cambierebbero, CRLF {crlf_dopo} invariati"); continue
        # checkpoint di ripristino (regola CLAUDE.md): branch dal commit corrente, se non esiste
        ck = f'checkpoint-{oggi}'
        if git(cart, 'rev-parse', '--verify', ck).returncode != 0:
            git(cart, 'branch', ck)
            if a.push: git(cart, 'push', 'origin', ck)
        f.write_bytes(nuovo)
        print(f"[{nome}] scritto: {len(mod)} righe, CRLF invariati ({crlf_dopo}), checkpoint {ck}")
        if a.push:
            git(cart, 'add', '_pages/home.md')
            git(cart, 'commit', '-m', 'home: testo specifico per la nicchia')
            git(cart, 'pull', '--rebase', 'origin', 'main')
            r = git(cart, 'push', 'origin', 'main')
            print(f"[{nome}] push exit {r.returncode}")
    print("fatto. Controlla con: git diff --stat (solo 6 righe per sito)")


if __name__ == '__main__':
    main()
