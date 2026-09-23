"""
genera_servizi.py
==================
Genera/aggiorna i post-servizio (uno per ogni voce in servizi_data.py) nella
cartella _posts del repo LOCALE crazyweb4test_local. Non tocca GitHub: scrive
solo file locali. Il push va fatto a mano dopo aver controllato il risultato
(git add / commit / push, oppure con git a riga di comando).

USO:
    python genera_servizi.py            -> crea/aggiorna i post servizio
    python genera_servizi.py --clean    -> sposta i post di test/sporcizia
                                            in _posts/_backup_test (NON li
                                            cancella mai per davvero)
    python genera_servizi.py --dry-run  -> mostra cosa farebbe, senza
                                            scrivere nulla

REGOLE FISSE (decise nella chat, non cambiarle senza motivo):
- Il repo di riferimento e' SEMPRE questa cartella locale (crazyweb4test_local),
  quella di TEST. Lo script non tocca mai crazyweb4 (produzione).
- Ogni post usa SOLO titoli H2 (##), MAI H3, e sempre almeno 4 H2: il tema
  al-folio mostra l'indice automatico solo se ci sono >= 2 titoli H2 nella
  pagina. Con 4 siamo larghi e coerenti in tutti i post.
- Se un post con lo stesso slug esiste gia', viene SOVRASCRITTO con il
  contenuto aggiornato da servizi_data.py (idempotente: si puo' rilanciare
  quante volte si vuole, non crea doppioni).
- Il file creato si chiama sempre _posts/AAAA-MM-GG-<slug>.md . La data e'
  quella del primo salvataggio se il file non esiste, altrimenti la data
  originale del file viene mantenuta (cosi' il post non "salta" nel blog).
"""

import os
import re
import sys
import datetime

from servizi_data import SERVIZI

# ------------------------------------------------------------------
# CONFIGURAZIONE: cartelle
# ------------------------------------------------------------------
REPO_DIR = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(REPO_DIR, "_posts")
BACKUP_DIR = os.path.join(POSTS_DIR, "_backup_test")

# File "sporchi": prove/test fatte durante lo sviluppo, non post veri.
# Vengono spostati in _backup_test con --clean, MAI cancellati per davvero.
FILE_DI_TEST = [
    "2026-09-19-facciata.md",
    "2026-09-20-esempiox.md",
    "2026-09-20-ferdinando.md",
    "2026-09-20-francesco.md",
    "2026-09-20-mmmmm.md",
    "2026-09-20-nuovo-post-prova.md",
    "2026-09-20-ultimox.md",
    "2026-09-20-ultrafico.md",
    "2026-09-21-enola.md",
    "2026-09-21-fabrizio.md",
    "2026-09-21-oooo.md",
    "2026-09-21-servizix.md",
]

CATEGORIA = "servizi"  # categoria Jekyll usata per tutti i post-servizio


# Testo standard usato quando "come" e' vuoto in servizi_data.py, cosi' non
# devi riscriverlo per ogni servizio ma puoi comunque personalizzarlo se vuoi.
COME_LAVORIAMO_STD = (
    "Partiamo sempre da un'analisi gratuita per capire dove si trova oggi la "
    "tua attivita', poi costruiamo insieme un piano su misura, con obiettivi "
    "chiari e report periodici per monitorare i progressi."
)


def slugify(testo):
    """Converte un testo libero in uno slug sicuro per URL (minuscolo,
    trattini, senza accenti/simboli). Usato solo come rete di sicurezza:
    lo slug andrebbe comunque scritto gia' pulito in servizi_data.py."""
    testo = testo.lower().strip()
    sostituzioni = {
        "a'": "a", "e'": "e", "i'": "i", "o'": "o", "u'": "u",
        "à": "a", "è": "e", "é": "e", "ì": "i", "ò": "o", "ù": "u",
    }
    for k, v in sostituzioni.items():
        testo = testo.replace(k, v)
    testo = re.sub(r"[^a-z0-9]+", "-", testo)
    return testo.strip("-")


def trova_file_esistente(slug):
    """Cerca nella cartella _posts un file che termina con -<slug>.md,
    indipendentemente dalla data nel nome. Serve per aggiornare un post
    gia' creato senza duplicarlo con una data diversa."""
    if not os.path.isdir(POSTS_DIR):
        return None
    suffisso = "-" + slug + ".md"
    for nome in os.listdir(POSTS_DIR):
        if nome.endswith(suffisso):
            return os.path.join(POSTS_DIR, nome)
    return None


def estrai_data_esistente(percorso_file):
    """Se il post esiste gia', legge la sua data originale dal nome del file
    (AAAA-MM-GG-slug.md) cosi' un post non 'salta' di data ogni volta che lo
    rigeneriamo. Se non esiste, ritorna None (verra' usata la data di oggi)."""
    nome = os.path.basename(percorso_file)
    m = re.match(r"^(\d{4}-\d{2}-\d{2})-", nome)
    return m.group(1) if m else None


def costruisci_markdown(servizio):
    """Costruisce il testo del post a partire da un dizionario servizio
    (vedi servizi_data.py). Ritorna SOLO il corpo Markdown, senza il front
    matter (che viene aggiunto da genera_post, dove serve conoscere la data
    del file per l'header)."""
    titolo = servizio["titolo"]
    intro = servizio["intro"].strip()
    voci = servizio.get("voci", [])
    perche = servizio["perche"].strip()
    come = (servizio.get("come") or "").strip() or COME_LAVORIAMO_STD

    righe_voci = "\n".join("- " + v for v in voci)

    # NB: sempre almeno 3 titoli H2 (mai H3 come primo livello) per attivare
    # l'indice automatico del tema al-folio, che richiede >= 2 titoli H2.
    # NOTA (22/09/2026): la sezione "Richiedi una consulenza" con il link
    # /agenzia/ e' stata rimossa su richiesta esplicita: non va rimessa
    # senza che venga richiesto di nuovo in chat.
    corpo = f"""## Cosa include il servizio

{intro}

{righe_voci}

## Perche' e' importante

{perche}

## Come lavoriamo

{come}
"""
    return corpo


def genera_post(servizio, dry_run=False):
    """Crea o aggiorna il file _posts/<data>-<slug>.md per un servizio.
    Ritorna una stringa di log leggibile (creato / aggiornato / [dry-run])."""
    slug = servizio["slug"]
    titolo = servizio["titolo"]
    descrizione = servizio["descrizione"]

    percorso_esistente = trova_file_esistente(slug)
    if percorso_esistente:
        data_str = estrai_data_esistente(percorso_esistente) or \
            datetime.date.today().isoformat()
        percorso_finale = percorso_esistente
        azione = "aggiornato"
    else:
        data_str = datetime.date.today().isoformat()
        nome_file = f"{data_str}-{slug}.md"
        percorso_finale = os.path.join(POSTS_DIR, nome_file)
        azione = "creato"

    front_matter = f"""---
layout: post
title: {titolo}
date: {data_str} 12:00:00
description: {descrizione}
categories: {CATEGORIA}
---

"""
    corpo = costruisci_markdown(servizio)
    testo_completo = front_matter + corpo

    if dry_run:
        return f"[dry-run] {azione}: {os.path.basename(percorso_finale)}"

    os.makedirs(POSTS_DIR, exist_ok=True)
    with open(percorso_finale, "w", encoding="utf-8", newline="\n") as f:
        f.write(testo_completo)

    return f"{azione}: {os.path.basename(percorso_finale)}"


def pulisci_post_di_test(dry_run=False):
    """Sposta i file elencati in FILE_DI_TEST dentro _posts/_backup_test/.
    NON cancella mai nulla per davvero: se vuoi eliminarli sul serio, dopo
    puoi svuotare tu la cartella _backup_test a mano quando sei sicuro."""
    spostati = []
    non_trovati = []

    if not dry_run:
        os.makedirs(BACKUP_DIR, exist_ok=True)

    for nome in FILE_DI_TEST:
        origine = os.path.join(POSTS_DIR, nome)
        if not os.path.isfile(origine):
            non_trovati.append(nome)
            continue
        destinazione = os.path.join(BACKUP_DIR, nome)
        if dry_run:
            spostati.append(f"[dry-run] sposterei: {nome}")
            continue
        os.replace(origine, destinazione)
        spostati.append(f"spostato in _backup_test: {nome}")

    return spostati, non_trovati


def main():
    dry_run = "--dry-run" in sys.argv
    fare_clean = "--clean" in sys.argv

    print(f"Repo: {REPO_DIR}")
    print(f"Cartella post: {POSTS_DIR}")
    if dry_run:
        print(">>> MODALITA' DRY-RUN: nessun file verra' modificato <<<")
    print("-" * 60)

    if fare_clean:
        print("Pulizia post di test...")
        spostati, non_trovati = pulisci_post_di_test(dry_run=dry_run)
        for riga in spostati:
            print("  " + riga)
        for nome in non_trovati:
            print(f"  (gia' assente, salto: {nome})")
        print("-" * 60)

    print(f"Generazione post-servizio ({len(SERVIZI)} servizi in servizi_data.py)...")
    for servizio in SERVIZI:
        risultato = genera_post(servizio, dry_run=dry_run)
        print("  " + risultato)

    print("-" * 60)
    if dry_run:
        print("Dry-run completato. Rilancia senza --dry-run per scrivere davvero.")
    else:
        print("Fatto. Controlla i file in _posts, poi fai commit/push a mano")
        print("(oppure chiedimi di pusharli su GitHub quando sei soddisfatto).")


if __name__ == "__main__":
    main()
