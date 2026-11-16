#!/bin/sh
# Parse every Soma file under the given directories (by default ../soma
# and ../pantheon, beside this repository) and list the ones with a syntax
# error, then how many parsed cleanly. Exits non-zero if any didn't.
#   sh scripts/parse-corpus.sh [DIR...]
set -u
here=$(cd "$(dirname "$0")/.." && pwd)
[ $# -eq 0 ] && set -- "$here/../soma/examples" "$here/../soma/theories/Soma" "$here/../pantheon"
list=$(mktemp)
find "$@" \( -name _build -o -name _opam -o -name node_modules -o -name '.net*' -o -name .soma-cache \) -prune -o \
  -type f \( -name '*.soma' -o -name '*.exp' -o -name '*.ext' -o -name '*.v' \) -print > "$list"
total=$(wc -l < "$list" | tr -d ' ')
bad=$(cd "$here" && xargs npx tree-sitter parse --quiet < "$list" 2>/dev/null | grep -E '(ERROR|MISSING)' | awk '{print $1}')
n=$(printf '%s' "$bad" | grep -c . || true)
[ -n "$bad" ] && printf '%s\n' "$bad"
echo "$((total - n)) of $total files parse without an error"
rm -f "$list"
[ "$n" -eq 0 ]
