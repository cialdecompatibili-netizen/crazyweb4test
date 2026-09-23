"""
Config condivisa per gli script in automazioni/.

Legge automazioni/.env (owner, repo, branch, token GitHub). Il file .env
NON e' su Git (vedi .gitignore) perche' contiene il token in chiaro.

Uso:
    from automazioni.common.config import OWNER, REPO, BRANCH, TOKEN
"""
import os
from pathlib import Path

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def _load_env(path: Path) -> dict:
    values = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        values[key.strip()] = val.strip()
    return values


_env = _load_env(_ENV_PATH)

TOKEN = os.environ.get("GITHUB_TOKEN") or _env.get("GITHUB_TOKEN")
OWNER = os.environ.get("GITHUB_OWNER") or _env.get("GITHUB_OWNER", "cialdecompatibili-netizen")
REPO = os.environ.get("GITHUB_REPO") or _env.get("GITHUB_REPO", "crazyweb4test")
BRANCH = os.environ.get("GITHUB_BRANCH") or _env.get("GITHUB_BRANCH", "main")

if not TOKEN:
    raise RuntimeError(
        "GITHUB_TOKEN mancante. Crea automazioni/.env con GITHUB_TOKEN=... "
        "(vedi automazioni/README.md)."
    )
