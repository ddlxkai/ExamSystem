#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import subprocess
from collections import defaultdict
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
LAW_ROOT = PROJECT_ROOT / "data" / "2026安全【法规】SVIP"
OUTPUT_ROOT = PROJECT_ROOT / "data" / "processed" / "law"
TEXT_DIR = OUTPUT_ROOT / "texts"
MANIFEST_PATH = OUTPUT_ROOT / "manifest.json"
CORPUS_PATH = OUTPUT_ROOT / "corpus.txt"
SUMMARY_PATH = OUTPUT_ROOT / "summary.md"

SUPPORTED_SUFFIXES = {".docx": 0, ".pdf": 1, ".html": 2, ".doc": 3, ".txt": 4}
AD_PATTERNS = [
    r"联系Q+Q/?微信[:：]?\s*\d+",
    r"精准押题联系微信\d+",
    r"唯一联系微信\d+",
    r"优路官方网站[:：]?\s*www\.youlu\.com",
    r"学员专用\s*请勿外泄",
    r"扫码关注更多",
    r"名师面授精华.*绝密押题.*",
    r"二建、监理、一建、一造、二造、安全、消防、咨询、检测课程押题.*",
    r"点亮职业人生",
    r"第\s*\d+\s*页\s*共\s*\d+\s*页",
    r"^内容$",
    r"^\d+$",
]
SECTION_HINTS = [
    "第一章",
    "第二章",
    "第三章",
    "第四章",
    "第五章",
    "第六章",
    "第七章",
    "安全生产法",
    "法律基础知识",
    "单行法律",
    "相关法律",
    "行政法规",
    "真题解析",
    "随堂测试",
]


class SimpleHTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.parts.append(data.strip())

    def text(self) -> str:
        return "\n".join(self.parts)


@dataclass
class SourceFile:
    path: Path
    suffix_rank: int


def normalize_stem(path: Path) -> str:
    return re.sub(r"\s+", "", path.stem.lower())


def pick_best_sources() -> list[Path]:
    grouped: dict[tuple[Path, str], list[SourceFile]] = defaultdict(list)
    for path in LAW_ROOT.rglob("*"):
        if not path.is_file():
            continue
        suffix = path.suffix.lower()
        if suffix not in SUPPORTED_SUFFIXES:
            continue
        grouped[(path.parent, normalize_stem(path))].append(SourceFile(path, SUPPORTED_SUFFIXES[suffix]))

    selected: list[Path] = []
    for files in grouped.values():
        selected.append(sorted(files, key=lambda item: (item.suffix_rank, item.path.name))[0].path)
    return sorted(selected)


def read_docx(path: Path) -> str:
    result = subprocess.run(
        ["textutil", "-convert", "txt", "-stdout", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def read_pdf(path: Path) -> str:
    helper = PROJECT_ROOT / "scripts" / ".cache" / "pdfkit_extract"
    result = subprocess.run([str(helper), str(path)], capture_output=True, text=True, check=True)
    return result.stdout


def read_html(path: Path) -> str:
    parser = SimpleHTMLTextExtractor()
    parser.feed(path.read_text(encoding="utf-8", errors="ignore"))
    return parser.text()


def read_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".docx" or suffix == ".doc":
        return read_docx(path)
    if suffix == ".pdf":
        return read_pdf(path)
    if suffix == ".html":
        return read_html(path)
    return path.read_text(encoding="utf-8", errors="ignore")


def clean_text(text: str) -> str:
    text = text.replace("\r", "\n").replace("\x0c", "\n")
    lines = [line.strip() for line in text.splitlines()]
    cleaned: list[str] = []

    for line in lines:
        if not line:
            if cleaned and cleaned[-1] != "":
                cleaned.append("")
            continue

        if line.startswith("===== 第") and line.endswith("页 ====="):
            continue

        blocked = False
        for pattern in AD_PATTERNS:
            if re.search(pattern, line):
                blocked = True
                break
        if blocked:
            continue

        line = re.sub(r"\s+", " ", line)
        line = line.replace("（ ", "（").replace(" ）", "）")
        if line:
            cleaned.append(line)

    text = "\n".join(cleaned)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def infer_tags(path: Path, text: str) -> list[str]:
    haystack = f"{path.as_posix()} {text[:2000]}"
    tags = [hint for hint in SECTION_HINTS if hint in haystack]
    return tags[:8]


def build_outputs() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    TEXT_DIR.mkdir(parents=True, exist_ok=True)

    manifest: list[dict[str, object]] = []
    corpus_parts: list[str] = []

    for path in pick_best_sources():
        try:
            raw_text = read_text(path)
        except Exception as exc:  # noqa: BLE001
            manifest.append(
                {
                    "file": str(path.relative_to(PROJECT_ROOT)),
                    "status": "failed",
                    "error": str(exc),
                }
            )
            continue

        cleaned_text = clean_text(raw_text)
        relative = path.relative_to(LAW_ROOT)
        output_name = re.sub(r"[\\/]+", "__", str(relative.with_suffix(".txt")))
        output_path = TEXT_DIR / output_name
        output_path.write_text(cleaned_text + "\n", encoding="utf-8")

        entry = {
            "file": str(path.relative_to(PROJECT_ROOT)),
            "status": "ok",
            "output": str(output_path.relative_to(PROJECT_ROOT)),
            "chars": len(cleaned_text),
            "lines": len(cleaned_text.splitlines()),
            "tags": infer_tags(path, cleaned_text),
        }
        manifest.append(entry)

        if cleaned_text:
            corpus_parts.append(
                "\n".join(
                    [
                        f"===== 文件：{path.relative_to(PROJECT_ROOT)} =====",
                        cleaned_text,
                        "",
                    ]
                )
            )

    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    CORPUS_PATH.write_text("\n".join(corpus_parts), encoding="utf-8")

    top_entries = sorted(
        [item for item in manifest if item.get("status") == "ok"],
        key=lambda item: int(item["chars"]),
        reverse=True,
    )[:20]
    summary_lines = [
        "# 法规语料清洗摘要",
        "",
        f"- 扫描目录：`{LAW_ROOT.relative_to(PROJECT_ROOT)}`",
        f"- 选取文件数：`{len([item for item in manifest if item.get('status') == 'ok'])}`",
        f"- 失败文件数：`{len([item for item in manifest if item.get('status') == 'failed'])}`",
        "",
        "## 长文本优先文件",
        "",
    ]
    for item in top_entries:
        summary_lines.append(
            f"- `{item['file']}` | {item['chars']} chars | tags={', '.join(item['tags'])}"
        )
    SUMMARY_PATH.write_text("\n".join(summary_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    build_outputs()
