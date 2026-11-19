#!/usr/bin/env bash
# make-pdf.sh – HTML → PDF mit Edge headless (so wie die PDFs in */reference/ entstanden sind).
#
#   tools/make-pdf.sh                        alle */reference/*.html und reference/*.html neu bauen
#   tools/make-pdf.sh a.html [b.html …]      je eine PDF neben die HTML (a.pdf)
#   tools/make-pdf.sh -o out.pdf a.html      genau eine Datei, eigenes Ziel
#
# Seitenformat und Ränder kommen aus dem @media print / @page der Seite, nicht von hier.
# --virtual-time-budget lässt die JS-Generatoren (Übungsblätter mit festen Seeds) fertig rendern.
set -euo pipefail

EDGE="${EDGE:-/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -x "$EDGE" ] || { echo "Edge nicht gefunden: $EDGE (EDGE=… setzen)" >&2; exit 1; }

winpath() { cygpath -m "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; }

render() { # $1 = html, $2 = pdf
  local html pdf
  html="$(winpath "$1")"
  mkdir -p "$(dirname "$2")"; pdf="$(winpath "$2")"
  rm -f "$2"
  "$EDGE" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=5000 \
    --print-to-pdf="$pdf" "file:///$html" >/dev/null 2>&1 || true
  if [ -s "$2" ]; then echo "ok  $2 ($(wc -c < "$2") B)"; else echo "FEHLER  $1 → $2" >&2; return 1; fi
}

out=""
if [ "${1:-}" = "-o" ]; then out="$2"; shift 2; [ $# -eq 1 ] || { echo "-o braucht genau eine HTML" >&2; exit 2; }; fi

if [ $# -eq 0 ]; then
  shopt -s nullglob
  set -- "$ROOT"/reference/*.html "$ROOT"/*/*/reference/*.html
fi

rc=0
for html in "$@"; do
  [ -f "$html" ] || { echo "keine Datei: $html" >&2; rc=1; continue; }
  render "$html" "${out:-${html%.html}.pdf}" || rc=1
done
exit $rc
