#!/usr/bin/env python3
"""Генерирует нейросетевую озвучку для всех португальских фраз курса.

Собирает фразы из data/ (лексика, диалоги, шпаргалка, [[...]] в грамматике),
синтезирует недостающие mp3 через edge-tts и пишет audio/manifest.json,
по которому сайт находит запись. Уже существующие файлы не перегенерируются,
файлы удалённых фраз удаляются.

Запуск:  pip install edge-tts && python3 scripts/generate_audio.py
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "audio"

# Роли совпадают с assets/js/core/speech.js:
# main — лексика и собеседник в диалогах, alt — реплики ученика.
VOICES = {"main": "pt-BR-FranciscaNeural", "alt": "pt-BR-AntonioNeural"}
RATE = "-5%"          # чуть медленнее обычной речи — удобнее для учёбы
CONCURRENCY = 4
RETRIES = 3

MARKUP = re.compile(r"\[\[(.+?)\]\]")


def clean(text: str) -> str:
    """Та же нормализация, что clean() в speech.js: ключ манифеста должен совпасть."""
    t = re.sub(r"\[.*?\]", "", str(text))
    t = re.sub(r"\s*→\s*", ", ", t)
    t = re.sub(r"([!?.])\s*/\s*", r"\1 ", t)
    t = re.sub(r"\s*/\s*", ", ", t)
    t = re.sub(r"\.\.\.|…", " ", t)
    t = t.replace("___", " ")
    return re.sub(r"\s+", " ", t).strip()


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def collect() -> dict[str, set[str]]:
    """Возвращает {нормализованный текст: {роли}}."""
    texts: dict[str, set[str]] = {}

    def add(text: str, role: str = "main") -> None:
        c = clean(text)
        if c:
            texts.setdefault(c, set()).add(role)

    for topic in load("vocab.json")["topics"]:
        for item in topic["items"]:
            add(item["pt"])

    dialogs = load("dialogs.json")
    for d in dialogs["dialogs"]:
        for line in d["lines"]:
            add(line["pt"], "alt" if line["who"] == dialogs["learner"] else "main")

    for group in load("cheat.json")["groups"]:
        for item in group["items"]:
            add(item["pt"])

    for unit in load("grammar/index.json")["units"]:
        body = (DATA / "grammar" / unit["file"]).read_text(encoding="utf-8")
        for m in MARKUP.finditer(body):
            add(m.group(1))
        for r in unit.get("razbors", []):
            add(r["s"])
            for p in r["points"]:
                for m in MARKUP.finditer(p):
                    add(m.group(1))
    return texts


def filename(text: str, voice: str) -> str:
    digest = hashlib.sha1(f"{voice}|{RATE}|{text}".encode("utf-8")).hexdigest()[:16]
    return f"{digest}.mp3"


async def synth(text: str, voice: str, path: Path, sem: asyncio.Semaphore) -> bool:
    async with sem:
        for attempt in range(1, RETRIES + 1):
            try:
                tmp = path.with_suffix(".part")
                await edge_tts.Communicate(text, voice, rate=RATE).save(str(tmp))
                if tmp.stat().st_size < 500:
                    raise RuntimeError("слишком маленький файл")
                tmp.rename(path)
                return True
            except Exception as exc:  # noqa: BLE001 — сеть, лимиты, ответ сервиса
                if attempt == RETRIES:
                    print(f"  ✗ {text[:60]!r}: {exc}", file=sys.stderr)
                    return False
                await asyncio.sleep(2 * attempt)
    return False


async def main() -> int:
    OUT.mkdir(exist_ok=True)
    texts = collect()
    plan = {}  # text -> {role: filename}
    jobs = []
    sem = asyncio.Semaphore(CONCURRENCY)
    for text, roles in sorted(texts.items()):
        plan[text] = {}
        for role in sorted(roles):
            name = filename(text, VOICES[role])
            plan[text][role] = name
            if not (OUT / name).exists():
                jobs.append((text, role, name))

    print(f"Фраз: {len(texts)}, файлов нужно: {sum(len(r) for r in plan.values())}, сгенерировать: {len(jobs)}")
    results = await asyncio.gather(*(synth(t, VOICES[r], OUT / n, sem) for t, r, n in jobs))
    failed = results.count(False)

    wanted = {n for roles in plan.values() for n in roles.values()}
    removed = 0
    for f in OUT.glob("*.mp3"):
        if f.name not in wanted:
            f.unlink()
            removed += 1
    for f in OUT.glob("*.part"):
        f.unlink()

    manifest = {
        "version": 1,
        "voices": VOICES,
        "rate": RATE,
        "texts": {
            text: {role: name for role, name in roles.items() if (OUT / name).exists()}
            for text, roles in plan.items()
        },
    }
    manifest["texts"] = {t: r for t, r in manifest["texts"].items() if r}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(f"Готово: в манифесте {len(manifest['texts'])} фраз, ошибок {failed}, удалено устаревших файлов {removed}.")
    # Частичный результат лучше, чем никакого: сайт озвучит остальное системным голосом.
    return 1 if jobs and failed == len(jobs) else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
