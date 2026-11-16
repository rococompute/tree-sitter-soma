# make            the parser as a shared library, libtree-sitter-soma.dylib
#                 (.so on Linux), which Emacs and other editors load
# make generate   src/parser.c from grammar.js (ABI 14: Emacs 29 and 30's
#                 tree-sitter 0.20-0.24 load it)
# make test       the corpus and highlight tests under test/
# make corpus     parse every Soma file in ../soma and ../pantheon
TS = npx tree-sitter
EXT = $(if $(filter Darwin,$(shell uname)),dylib,so)
LIB = libtree-sitter-soma.$(EXT)

$(LIB): src/parser.c src/scanner.c
	$(CC) -O2 -shared -fPIC -Isrc src/parser.c src/scanner.c -o $@

generate src/parser.c: grammar.js node_modules
	$(TS) generate --abi 14

test: node_modules
	$(TS) test

corpus: node_modules
	sh scripts/parse-corpus.sh

node_modules:
	npm install

clean:
	rm -f libtree-sitter-soma.*

.PHONY: generate test corpus clean
