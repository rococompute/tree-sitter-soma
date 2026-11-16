# tree-sitter-soma

A [tree-sitter](https://tree-sitter.github.io) grammar for
[Soma](https://github.com/rococompute/soma): Rocq's language with Soma's
additions. It reads `.soma` programs, `.exp` proofs and `.ext` macro files,
and Rocq's `.v` files too. [soma-ts-mode](https://github.com/rococompute/soma-ts-mode)
uses it for Emacs.

## What it parses

Rocq's notations, Soma's `.ext` macros and readers change the syntax as a
file is read, so no fixed grammar can parse every term. This one parses
what stays the same, and reads the rest as tokens. That's enough for
highlighting, folding, navigating by definition and an outline, and it
never gives up on a file:

- **Sentences.** A file is sentences, each ended by a `.` before a blank or
  the end of the file. `N.add`, `3.5`, `x.(field)` and `..` are not ends.
  Between sentences, a proof can have bullets (`-`, `+`, `*`) and braces
  (`{`, `}`, `2:{`).
- **Definitions** have a `name`, with a keyword (`Definition`, `Fixpoint`,
  `Recursive`, `Explore`, `Macro`, `Lemma`, `Instance`, ...) or Soma's
  without one: `square (x : N) : N := x * x.`, `main : io unit := ...`.
  Modifiers and attributes can come first: `Local`, `Program`,
  `#[export]`.
- **Inductives** (`Inductive`, `CoInductive`, `Variant`) have a `name` and
  `constructor`s, each with its own `name`.
- **Brackets** nest: `( )`, `[ ]`, `{ }`, `{| |}`, `#[ ]`, and
  `match ... end`.
- **Tokens:** identifiers (a qualified one, `Stdlib.Strings.String.length`,
  is one token), numbers, strings (`"say ""hi"""`), scopes (`12%N`,
  `(-3)%Z`), operators (ASCII's symbols and Unicode's: `∅`, `∀`, `→`),
  JSX tags (`<div`, `</div>`).
- **Comments** nest, and a string inside one is a string, so `"*)"` doesn't
  end it. A doc comment, `(** ... *)`, is a `doc_comment`.
- **`#lang lisp`.** A file that starts with this line is s-expressions
  (`list`, `atom`, `string`, `; line_comment`), as Soma's lisp reader reads
  it. In it, `(*` is a call, not a comment.

A sentence that is neither a definition nor an inductive is a `sentence`:
a command (`Require Import Sandbox.`), a tactic (`intros x.`), or a
Waterproof proof sentence (`We conclude that n + 0 = n.`).

```
square (x : N) : N := x * x.

(source_file
  (definition name: (identifier)
    (parenthesized (identifier) (identifier))
    (identifier) (identifier) (operator) (identifier)))
```

## Use

- **Emacs 29 or later:** [soma-ts-mode](https://github.com/rococompute/soma-ts-mode)
  installs this grammar itself.
- **Any editor that loads a compiled grammar:** run `make`. It builds
  `libtree-sitter-soma.dylib` (`.so` on Linux) from `src/`, which is
  committed, with a C compiler and nothing else.
- **Highlights:** `queries/highlights.scm` uses the usual capture names
  (`@keyword`, `@function`, `@type`, `@constructor`, `@comment.documentation`,
  ...).

`src/parser.c` is generated for ABI 14, so tree-sitter 0.20 through 0.24
loads it. Those are the versions in Emacs 29 and 30.

## Develop

```sh
npm install         # tree-sitter-cli, pinned in package.json
make generate       # src/parser.c from grammar.js
make test           # test/corpus (trees) and test/highlight (captures)
make corpus         # parse every Soma file in ../soma and ../pantheon
```

`grammar.js` is the grammar. `src/scanner.c` reads what a regular
expression can't: nested comments, sentence ends, and `#lang`. After
changing the grammar, run `make generate` and commit `src/` with it.
`make corpus` should keep reporting no files with an error. When it was
written, all 228 Soma files in soma and pantheon parsed cleanly, and so
did stdpp's 86 Rocq files.

## License

MIT
