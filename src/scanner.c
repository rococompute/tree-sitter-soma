// What Soma's grammar can't say with regular expressions:
//
// - comments, which nest: (* a (* b *) c *), and doc comments, (** ... *);
//   a string in a comment is read as one, so "*)" in it doesn't end it;
// - the end of a sentence: a "." before a blank or the end of the file, so
//   that N.add, 3.5, x.(field) and .. are not ends;
// - `#lang NAME` at the start of a file, after which the file is read by
//   another reader: s-expressions here, where (* is not a comment.

#include "tree_sitter/alloc.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <wctype.h>

enum TokenType {
  COMMENT,
  DOC_COMMENT,
  SENTENCE_END,
  LANG_LINE,
  DOT,
  ERROR_SENTINEL,
};

typedef struct {
  bool lisp;  // after #lang: no Rocq comments
} Scanner;

void *tree_sitter_soma_external_scanner_create(void) {
  Scanner *s = ts_malloc(sizeof(Scanner));
  s->lisp = false;
  return s;
}

void tree_sitter_soma_external_scanner_destroy(void *payload) { ts_free(payload); }

unsigned tree_sitter_soma_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *s = payload;
  buffer[0] = s->lisp ? 1 : 0;
  return 1;
}

void tree_sitter_soma_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *s = payload;
  s->lisp = length > 0 && buffer[0] == 1;
}

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

// after "(*": the rest of a comment, nested comments and strings included.
// An unfinished comment runs to the end of the file.
static void comment_body(TSLexer *lexer) {
  unsigned depth = 1;
  while (depth > 0 && !lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    advance(lexer);
    if (c == '(' && lexer->lookahead == '*') {
      advance(lexer);
      depth++;
    } else if (c == '*' && lexer->lookahead == ')') {
      advance(lexer);
      depth--;
    } else if (c == '"') {
      // a string, its quotes doubled: "" is a quote
      while (!lexer->eof(lexer)) {
        if (lexer->lookahead == '"') {
          advance(lexer);
          if (lexer->lookahead != '"') break;
        }
        advance(lexer);
      }
    }
  }
}

bool tree_sitter_soma_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid) {
  Scanner *s = payload;
  if (valid[ERROR_SENTINEL]) return false;  // error recovery: let the lexer try

  while (iswspace(lexer->lookahead)) lexer->advance(lexer, true);

  if (valid[LANG_LINE] && lexer->lookahead == '#') {
    advance(lexer);
    const char *lang = "lang";
    for (const char *p = lang; *p; p++) {
      if (lexer->lookahead != *p) return false;
      advance(lexer);
    }
    if (lexer->lookahead != ' ' && lexer->lookahead != '\t') return false;
    while (!lexer->eof(lexer) && lexer->lookahead != '\n') advance(lexer);
    s->lisp = true;
    lexer->result_symbol = LANG_LINE;
    return true;
  }

  // every "." is read here, never by the lexer: one before a blank ends a
  // sentence, and only that (where a sentence can't end, it is an error,
  // not a dot); any other is a dot, ".." one dot
  if (lexer->lookahead == '.') {
    advance(lexer);
    if (lexer->eof(lexer) || iswspace(lexer->lookahead)) {
      if (!valid[SENTENCE_END]) return false;
      lexer->result_symbol = SENTENCE_END;
      return true;
    }
    if (!valid[DOT]) return false;
    if (lexer->lookahead == '.') advance(lexer);
    lexer->result_symbol = DOT;
    return true;
  }

  if (!s->lisp && (valid[COMMENT] || valid[DOC_COMMENT]) && lexer->lookahead == '(') {
    advance(lexer);
    if (lexer->lookahead != '*') return false;
    advance(lexer);
    bool doc = false;
    if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == ')') {  // (**) is an empty comment
        advance(lexer);
        lexer->result_symbol = COMMENT;
        return true;
      }
      // (** doc *), but (*** ... ***) banners too
      doc = true;
    }
    comment_body(lexer);
    lexer->result_symbol = doc ? DOC_COMMENT : COMMENT;
    return true;
  }

  return false;
}
