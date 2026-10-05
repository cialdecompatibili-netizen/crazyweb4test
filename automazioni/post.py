# -*- coding: utf-8 -*-
"""
post.py - articoli del blog (_posts/): elenca, crea, cambia campi, nascondi/mostra, sostituisci il testo.

1. Cosa fa: gestisce i post del blog con lo stile gia' validato (front matter come quelli creati dall'admin).
2. Su quale file agisce: _posts/AAAA-MM-GG-<slug>.md. NON gestisce i SERVIZI (collection _servizi/): quelli si
   pubblicano SOLO con `python pubblica_servizi.py` (CLAUDE.md). Non crea mai `permalink:`.
3. Lavora in locale (file + git), niente API GitHub.
4. Origine: richiesta del 05/10/2026 (automatizzare articoli).

Uso (i comandi di scrittura accettano --sito --dry-run --push --conferma):
  python -m automazioni.post elenco [--categoria nome]
  python -m automazioni.post crea --titolo "Titolo" --categoria seo [--descrizione "..."] [--data "2026-10-05 09:30"]
         [--slug mio-slug] [--thumbnail assets/img/foto.png] [--testo-file corpo.md | --testo "riga"] [--nascosto]
  python -m automazioni.post campo <slug> description="nuovo" thumbnail=assets/img/x.png [--rimuovi chiave]
  python -m automazioni.post nascondi <slug>      |   python -m automazioni.post mostra <slug>
  python -m automazioni.post testo <slug> --testo-file corpo.md

REGOLE (CLAUDE.md, punti 3, 6, 11, 23, 28):
- Il file di testo passato con --testo-file contiene SOLO il corpo (niente front matter).
- MAI `permalink:`; `slug:`/`slug_precedenti:` li gestisce l'admin (generano i redirect): qui sono rifiutati.
- Lo slug non deve gia' esistere tra i post (due pagine sullo stesso URL: Jekyll ne tiene una, senza errore).
- Categoria: minuscole, numeri, trattini (es. senza-categoria). Cambiare categoria cambia l'URL e i vecchi
  indirizzi NON reindirizzano: `campo categories=...` lo ricorda.
- Nascondi = `published: false` (non `draft`): la pagina sparisce da URL, sitemap, elenchi e ricerca.
- File in CRLF, UTF-8 senza BOM. Un post con data futura non viene pubblicato da Jekyll: la data di default e' adesso.
"""
import argparse
import datetime
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from automazioni.common import sito  # noqa: E402
from automazioni.common.sito import Errore  # noqa: E402

RIFIUTATE = {"permalink", "slug", "slug_precedenti", "layout"}
RE_DATA = re.compile(r"^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$")
RE_CAT = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _slug_file(nome):
    return re.sub(r"^\d{4}-\d{2}-\d{2}-", "", pathlib.Path(nome).stem)


def _trova_post(base, ident):
    ident = ident.replace("\\", "/").split("/")[-1]
    cand = [f for f in sorted((base / "_posts").glob("*.md"))
            if ident in (f.name, f.stem, _slug_file(f.name))]
    if len(cand) != 1:
        raise Errore(f"post '{ident}': trovati {len(cand)} (atteso 1). Usa lo slug o il nome file esatto")
    return f"_posts/{cand[0].name}"


def _corpo_da_args(a):
    if a.testo_file and a.testo:
        raise Errore("usa --testo-file OPPURE --testo, non entrambi")
    if a.testo_file:
        p = pathlib.Path(a.testo_file)
        if not p.is_file():
            raise Errore(f"file non trovato: {a.testo_file}")
        t = p.read_text(encoding="utf-8-sig")
    else:
        t = a.testo or ""
    if t.lstrip().startswith("---"):
        raise Errore("il testo deve essere solo il corpo: togli il front matter (---)")
    return t.strip("\r\n")


def _eol_sito(base):
    return sito.eol((base / "_config.yml").read_bytes())


def cmd_elenco(a):
    base = sito.trova_sito(a.sito)
    n = 0
    for f in sorted((base / "_posts").glob("*.md"), reverse=True):
        d = f.read_bytes()
        try:
            cat, tit, pub = sito.fm_leggi(d, "categories"), sito.fm_leggi(d, "title"), sito.fm_leggi(d, "published")
        except Errore:
            continue
        if a.categoria and (cat or "") != a.categoria:
            continue
        n += 1
        print(f"  {f.name[:10]}  {(cat or '-'):<18} {'NASCOSTO ' if pub == 'false' else ''}{tit or f.name}  [{_slug_file(f.name)}]")
    print(f"{n} post")


def cmd_crea(a):
    base = sito.prepara(a)
    s = a.slug or sito.slug(a.titolo)
    if sito.slug(s) != s:
        raise Errore("slug: solo minuscole, numeri e trattini")
    for f in (base / "_posts").glob("*.md"):
        if _slug_file(f.name) == s:
            raise Errore(f"esiste gia' un post con slug '{s}': {f.name}")
    if not RE_CAT.match(a.categoria):
        raise Errore("categoria: minuscole, numeri e trattini (es. senza-categoria)")
    data = a.data or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if not RE_DATA.match(data):
        raise Errore("data: formato AAAA-MM-GG oppure 'AAAA-MM-GG HH:MM'")
    if len(data) == 16:
        data += ":00"
    if a.thumbnail and not (base / a.thumbnail).is_file():
        print(f"ATTENZIONE: thumbnail {a.thumbnail} non esiste nel sito")
    corpo = _corpo_da_args(a)
    righe = ["---", "layout: post", "title: " + sito.yq(a.titolo), "date: " + data]
    if a.descrizione:
        righe.append("description: " + sito.yq(a.descrizione))
    righe += ["categories: " + a.categoria, "toc:", "  beginning: true"]
    if a.thumbnail:
        righe.append("thumbnail: " + sito.yq(a.thumbnail))
    if a.nascosto:
        righe.append("published: false")
    righe += ["---", "", corpo, ""]
    nl = _eol_sito(base)
    rel = f"_posts/{data[:10]}-{s}.md"
    if (base / rel).exists():
        raise Errore(f"{rel} esiste gia'")
    sito.applica(base, a, {rel: sito.con_eol("\n".join(righe), nl)}, [rel], f"post: {a.titolo}")


def cmd_campo(a):
    base = sito.prepara(a)
    rel = _trova_post(base, a.post)
    originale = (base / rel).read_bytes()
    dati = originale
    for c in a.coppie:
        if "=" not in c:
            raise Errore(f"'{c}': usa chiave=valore")
        k, _, v = c.partition("=")
        k = k.strip()
        if k in RIFIUTATE:
            raise Errore(f"'{k}' non si imposta da qui (cambierebbe l'URL senza redirect): usa l'admin")
        if k == "categories":
            if not RE_CAT.match(v):
                raise Errore("categories: minuscole, numeri e trattini, una sola categoria")
            print("ATTENZIONE: cambiare categoria cambia l'URL del post e i vecchi indirizzi NON reindirizzano")
        dati, _ = sito.fm_imposta(dati, k, v if k in ("title", "description", "thumbnail") else sito.valore_cli(v))
    for k in a.rimuovi or []:
        if k in RIFIUTATE or k in ("categories", "title"):
            raise Errore(f"'{k}' non si toglie")
        dati, _ = sito.fm_rimuovi(dati, k)
    cambi = {rel: dati} if dati != originale else {}
    sito.applica(base, a, cambi, [rel], f"post: campi di {a.post}")


def _visibilita(nascondi):
    def cmd(a):
        base = sito.prepara(a)
        rel = _trova_post(base, a.post)
        originale = (base / rel).read_bytes()
        if nascondi:
            dati, _ = sito.fm_imposta(originale, "published", False)
        else:
            dati, _ = sito.fm_rimuovi(originale, "published")
        cambi = {rel: dati} if dati != originale else {}
        sito.applica(base, a, cambi, [rel], f"post: {'nascosto' if nascondi else 'mostrato'} {a.post}")
    return cmd


def cmd_testo(a):
    base = sito.prepara(a)
    rel = _trova_post(base, a.post)
    originale = (base / rel).read_bytes()
    righe = sito.righe_di(originale)
    fine = sito.fm_fine(righe)
    nl = sito.eol(originale)
    testa = sito.unisci(righe[:fine + 1])  # gli '\r' sono gia' dentro le righe: non usare nl per unirle
    corpo = _corpo_da_args(a)
    if not corpo:
        raise Errore("testo vuoto: passa --testo-file o --testo")
    nuovo = testa + b"\n" + nl + sito.con_eol(corpo, nl) + nl
    cambi = {rel: nuovo} if nuovo != originale else {}
    sito.applica(base, a, cambi, [rel], f"post: testo di {a.post}")


def costruisci():
    ap = argparse.ArgumentParser(prog="post", formatter_class=argparse.RawDescriptionHelpFormatter, description=__doc__.split("\n")[1])
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("elenco")
    p.add_argument("--sito")
    p.add_argument("--categoria")
    p.set_defaults(fn=cmd_elenco)

    p = sp.add_parser("crea")
    sito.argomenti_comuni(p)
    p.add_argument("--titolo", required=True)
    p.add_argument("--categoria", default="senza-categoria")
    p.add_argument("--descrizione")
    p.add_argument("--data")
    p.add_argument("--slug")
    p.add_argument("--thumbnail")
    p.add_argument("--testo-file")
    p.add_argument("--testo")
    p.add_argument("--nascosto", action="store_true")
    p.set_defaults(fn=cmd_crea)

    p = sp.add_parser("campo")
    sito.argomenti_comuni(p)
    p.add_argument("post")
    p.add_argument("coppie", nargs="*", help="chiave=valore")
    p.add_argument("--rimuovi", action="append")
    p.set_defaults(fn=cmd_campo)

    for nome, nasc in (("nascondi", True), ("mostra", False)):
        p = sp.add_parser(nome)
        sito.argomenti_comuni(p)
        p.add_argument("post")
        p.set_defaults(fn=_visibilita(nasc))

    p = sp.add_parser("testo")
    sito.argomenti_comuni(p)
    p.add_argument("post")
    p.add_argument("--testo-file")
    p.add_argument("--testo")
    p.set_defaults(fn=cmd_testo)
    return ap


def main(argv=None):
    a = costruisci().parse_args(argv)
    sito.principale(lambda: a.fn(a))


if __name__ == "__main__":
    main()
