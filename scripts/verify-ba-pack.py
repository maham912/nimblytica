#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text()
css = (ROOT / "css" / "site.css").read_text()


class PunchParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_punch = False
        self.in_sheet = False
        self.in_span = False
        self.depth = 0
        self.sheet_depth = 0
        self.span_depth = 0
        self.buf = []
        self.cells = []
        self.fallbacks = set()
        self.chart_ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        cls = attrs.get("class", "")
        if tag == "figure" and "ba-punch" in cls.split():
            self.in_punch = True
            self.depth = 1
            return
        if self.in_punch:
            self.depth += 1
            if tag == "div" and "ba-sheet" in cls.split():
                self.in_sheet = True
                self.sheet_depth = self.depth
            if self.in_sheet and tag == "span":
                self.in_span = True
                self.span_depth = self.depth
                self.buf = []
        if tag == "div" and attrs.get("id") in {"wb-chart-hc", "wb-chart-ot"}:
            self.chart_ids.add(attrs["id"])
        if "chart-fallback" in cls.split():
            self.fallbacks.add(attrs.get("data-for") or cls)

    def handle_endtag(self, tag):
        if self.in_span and tag == "span" and self.depth == self.span_depth:
            text = "".join(self.buf).strip()
            self.cells.append(text)
            self.in_span = False
        if self.in_sheet and tag == "div" and self.depth == self.sheet_depth:
            self.in_sheet = False
        if self.in_punch:
            self.depth -= 1
            if self.depth <= 0:
                self.in_punch = False

    def handle_data(self, data):
        if self.in_span:
            self.buf.append(data)


errors = []
parser = PunchParser()
parser.feed(html)

empty = [i for i, t in enumerate(parser.cells) if not t]
if empty:
    errors.append(f"{len(empty)} empty .ba-sheet-row span cells; Before must show a readable Northwind OT pack")
if len(parser.cells) < 16:
    errors.append(f"only {len(parser.cells)} sheet cells; expected poster + Before rows")

if re.search(
    r"\.ba-sheet-row span\s*\{[^}]*height:\s*12px;[^}]*background:\s*#1a1a1a",
    css,
    re.S,
):
    errors.append("skeleton bar CSS still paints empty #1a1a1a cells on the dark card")

if not re.search(r"\.ba-sheet-row span\s*\{[^}]*color:", css, re.S):
    errors.append(".ba-sheet-row span has no text color")

for cid in ("wb-chart-hc", "wb-chart-ot"):
    if cid not in parser.chart_ids:
        errors.append(f"missing #{cid}")
    nearby = html[max(0, html.find(cid) - 120) : html.find(cid) + 900]
    if "chart-fallback" not in nearby:
        errors.append(f"#{cid} has no chart-fallback empty state")

blob = html + css
for word in ("Providence", "PSJH", "SFV", "home-call", "home call"):
    if word.lower() in blob.lower():
        errors.append(f"forbidden term {word!r}")
if re.search(r"https://checkout\.stripe\.com/\S+", blob):
    errors.append("invented Stripe checkout URL")

if errors:
    print("FAIL")
    for item in errors:
        print(f"- {item}")
    sys.exit(1)

print("PASS")
print(f"sheet_cells={len(parser.cells)} chart_ids={sorted(parser.chart_ids)}")
