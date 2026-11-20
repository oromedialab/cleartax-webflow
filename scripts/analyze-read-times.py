#!/usr/bin/env python3
"""
Estimates a read time for every Knowledge Hub link by reading the document.

  pip install pypdf     # once (a venv is fine)
  python3 scripts/analyze-read-times.py

For each unique href in src/data/knowledge-hub.ts: download it, extract the
text and the cover title (PDF via pypdf, web page via a plain tag strip), count words and divide
by 200 wpm. Designed PDFs with little extractable text (slide-style decks,
image-led case studies) fall back to ~120 words per page. Results are cached
in src/data/knowledge-hub-readtimes.json, which sync-knowledge-hub.mjs uses
when the sheet has no read-time value. Only hrefs missing from the cache are
fetched, so re-running after adding rows is cheap; pass --all to redo them.
"""
import io, json, math, re, sys, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src/data/knowledge-hub.ts"
CACHE = ROOT / "src/data/knowledge-hub-readtimes.json"
WPM = 200
FALLBACK_WORDS_PER_PAGE = 120
MIN_WORDS_PER_PAGE = 60  # below this the PDF is treated as image-led


def pdf_title(page):
    """The cover title: the largest-type text on page 1 (e.g. 'How Meesho cut TDS demand notices by 70%')."""
    chunks = []

    def visit(text, cm, tm, font, size):
        if text.strip():
            chunks.append((abs(size * (tm[3] or 1) * (cm[3] or 1)) or size, text))

    try:
        page.extract_text(visitor_text=visit)
    except Exception:
        return None
    if not chunks:
        return None
    top = max(sz for sz, _ in chunks)
    title = re.sub(r"\s+", " ", "".join(t for sz, t in chunks if sz >= top * 0.92)).strip()
    return title if 8 <= len(title) <= 160 else None


def analyse(href):
    req = urllib.request.Request(href, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read()
        ctype = r.headers.get("content-type", "")
    if body[:4] == b"%PDF" or "pdf" in ctype:
        reader = PdfReader(io.BytesIO(body))
        pages = len(reader.pages)
        words = sum(len((p.extract_text() or "").split()) for p in reader.pages)
        title = pdf_title(reader.pages[0]) if pages else None
        method = "pdf-text"
        if pages and words / pages < MIN_WORDS_PER_PAGE:
            words, method = pages * FALLBACK_WORDS_PER_PAGE, "pdf-pages"
    else:
        html = body.decode("utf-8", "ignore")
        html = re.sub(r"(?is)<(script|style|nav|header|footer|noscript)\b.*?</\1>", " ", html)
        m = re.search(r"(?is)<article\b.*?</article>|<main\b.*?</main>", html)
        text = re.sub(r"(?s)<[^>]+>", " ", m.group(0) if m else html)
        title = None
        words, pages, method = len(text.split()), 0, "html"
        if words < 300:  # JS-rendered shell: nothing real to count
            raise ValueError(f"only {words} words in page source")
    return {"minutes": max(1, math.ceil(words / WPM)), "words": words, "pages": pages, "method": method, "title": title}


def main():
    hrefs = sorted(set(re.findall(r"href: '(https?://[^']+)'", DATA.read_text())))
    cache = {} if "--all" in sys.argv else (json.loads(CACHE.read_text()) if CACHE.exists() else {})
    # Entries from before titles were captured have no "title" key: redo them.
    # Dead links are re-checked every run in case they have been fixed.
    todo = [h for h in hrefs if h not in cache or "title" not in cache[h]]
    print(f"{len(hrefs)} links, {len(todo)} to analyse")

    def work(h):
        try:
            return h, analyse(h)
        except urllib.error.HTTPError as e:
            # A page that no longer exists: remembered so the sync can drop the card.
            if e.code in (404, 410):
                return h, {"dead": True, "status": e.code}
            return h, {"error": str(e)[:120]}
        except Exception as e:  # keep going; report at the end
            return h, {"error": str(e)[:120]}

    with ThreadPoolExecutor(6) as ex:
        for h, res in ex.map(work, todo):
            if "error" in res:
                print("FAIL", h, res["error"])
            elif res.get("dead"):
                cache[h] = res
                print("DEAD", res["status"], h)
            else:
                cache[h] = res
                print(f'{res["minutes"]:>3} min  {res["method"]:9} {res["words"]:>6}w {res["pages"]:>3}p  {h.split("/")[-1][:60]}')
    CACHE.write_text(json.dumps({h: cache[h] for h in sorted(cache)}, indent=1) + "\n")
    print(f"wrote {CACHE.relative_to(ROOT)} ({len(cache)} entries)")


main()
