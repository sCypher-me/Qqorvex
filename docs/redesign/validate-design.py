from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
source = (ROOT / "DESIGN.md").read_text(encoding="utf-8")
match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", source)
if not match:
    raise SystemExit("front matter ausente ou mal delimitado")


def parse_scalar(raw: str) -> object:
    raw = raw.strip()
    if raw.startswith('"'):
        return json.loads(raw)
    if raw in {"true", "false"}:
        return raw == "true"
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    if re.fullmatch(r"-?\d+\.\d+", raw):
        return float(raw)
    return raw


def parse_mapping(block: str) -> dict[str, object]:
    """Parseia o subconjunto YAML usado pelo contrato: mappings e escalares."""
    root: dict[str, object] = {}
    stack: list[tuple[int, dict[str, object]]] = [(-1, root)]
    for number, line in enumerate(block.splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent % 2:
            raise SystemExit(f"indentação YAML inválida na linha {number}")
        stripped = line.strip()
        if ":" not in stripped:
            raise SystemExit(f"mapping YAML inválido na linha {number}")
        key, raw = stripped.split(":", 1)
        if not key or key.startswith("-"):
            raise SystemExit(f"chave YAML inválida na linha {number}")
        while stack[-1][0] >= indent:
            stack.pop()
        parent = stack[-1][1]
        if key in parent:
            raise SystemExit(f"chave YAML duplicada na linha {number}: {key}")
        if raw.strip():
            parent[key] = parse_scalar(raw)
        else:
            child: dict[str, object] = {}
            parent[key] = child
            stack.append((indent, child))
    return root


tokens = parse_mapping(match.group(1))
paths: set[str] = set()


def collect(value: object, prefix: str = "") -> None:
    if not isinstance(value, dict):
        return
    for key, child in value.items():
        path = f"{prefix}.{key}" if prefix else str(key)
        paths.add(path)
        collect(child, path)


collect(tokens)
references = re.findall(r"\{([^}]+)\}", match.group(1))
broken = sorted(set(references) - paths)
headings = re.findall(r"^## (.+)$", source, re.MULTILINE)
duplicates = sorted({heading for heading in headings if headings.count(heading) > 1})
required = [
    "Overview",
    "Colors",
    "Typography",
    "Layout",
    "Elevation & Depth",
    "Shapes",
    "Components",
    "Do's and Don'ts",
]

report = {
    "name": tokens.get("name"),
    "version": tokens.get("version"),
    "colors": len(tokens.get("colors", {})),
    "typography": len(tokens.get("typography", {})),
    "components": len(tokens.get("components", {})),
    "references": len(references),
    "brokenReferences": broken,
    "duplicateHeadings": duplicates,
    "canonicalSectionOrder": headings == required,
    "sections": headings,
}
print(json.dumps(report, ensure_ascii=False, indent=2))

if broken or duplicates or headings != required:
    raise SystemExit(1)
