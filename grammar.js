/**
 * @file Soma: Rocq's language (Gallina and its commands) with Soma's
 *   additions, for tree-sitter.
 * @license MIT
 *
 * Soma is Rocq with definitions that need no keyword
 * (`square (x : N) : N := x * x.`), Recursive, Explore and Macro, gradual
 * typing (Any, unk, raise, cast), Waterproof's proof sentences, JSX, and
 * readers such as `#lang lisp`. Rocq's notations, Soma's .ext macros and
 * readers change the syntax as a file is read, so no fixed grammar parses
 * every term. This one parses what doesn't change:
 *
 * - a file is sentences, each ended by a `.` before a blank (or the end:
 *   any other `.`, as in `x.(field)` or `..`, is a `dot`),
 *   with comments (which nest) and doc comments (`(** ... *)`) between
 *   tokens, and a proof's bullets and braces between sentences;
 * - a definition, with or without a keyword, has a name; an Inductive's
 *   constructors have names;
 * - brackets nest: `( )`, `[ ]`, `{ }`, `{| |}`, `#[ ]`, and
 *   `match ... end`;
 * - everything else is a token: identifiers (qualified ones whole), numbers,
 *   strings, scopes (`%N`), operators, JSX tags.
 *
 * A file starting with `#lang lisp` is s-expressions instead.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Commands that define a name: `Definition name ...`
const DEFINING = [
  'Definition', 'Fixpoint', 'CoFixpoint', 'Recursive', 'Explore', 'Macro',
  'Lemma', 'Theorem', 'Example', 'Corollary', 'Fact', 'Remark',
  'Proposition', 'Property', 'Conjecture', 'Let', 'Function',
  'Record', 'Structure', 'Class', 'Instance',
  'Axiom', 'Parameter', 'Variable', 'Hypothesis', 'Ltac',
  'Module', 'Section', 'Abbreviation', 'Reader',
];

// Commands that define a type by its constructors
const INDUCTIVE = ['Inductive', 'CoInductive', 'Variant'];

// What can come before a defining command
const MODIFIERS = [
  'Local', 'Global', 'Program', 'Polymorphic', 'Monomorphic',
  'Cumulative', 'NonCumulative', 'Private',
];

const IDENT_START = '[\\p{L}_]';
const IDENT_PART = '[\\p{L}\\p{N}_\']';

module.exports = grammar({
  name: 'soma',

  externals: $ => [
    $.comment,
    $.doc_comment,
    $._sentence_end,
    $.lang_line,
    $.dot,
    $._error_sentinel,
  ],

  extras: $ => [/\s/, $.comment, $.doc_comment],

  word: $ => $.identifier,

  conflicts: $ => [
    // a sentence that starts with a name is a definition when its tokens
    // have a := outside brackets, and a command or tactic otherwise
    [$.definition, $._first],
    [$.definition, $._term_no_bar],
    // `2: tac.` is a sentence, `2:{` a goal's focus
    [$.focus, $._first],
  ],

  rules: {
    source_file: $ => choice(
      seq($.lang_line, repeat($._lisp)),
      repeat($._item),
    ),

    _item: $ => choice(
      $.definition,
      $.inductive,
      $.sentence,
      $.bullet,
      $.focus,
    ),

    // `Definition name binders : type := body.`, and Soma's
    // `name binders : type := body.`, with no keyword
    definition: $ => choice(
      // the name is the identifier after the keyword; Instance's is optional
      // (`Instance : Show t := ...`)
      prec.dynamic(1, seq(
        repeat($._modifier),
        field('keyword', alias(choice(...DEFINING), $.keyword)),
        field('name', $.identifier),
        repeat($._token),
        $._sentence_end,
      )),
      seq(
        repeat($._modifier),
        field('keyword', alias(choice(...DEFINING), $.keyword)),
        repeat($._token),
        $._sentence_end,
      ),
      prec.dynamic(1, seq(
        field('name', $.identifier),
        repeat($._term),
        optional(seq(':', repeat($._term))),
        ':=',
        repeat($._token),
        $._sentence_end,
      )),
    ),

    // `Inductive name binders : type := | C args : type | ...`
    inductive: $ => seq(
      repeat($._modifier),
      field('keyword', alias(choice(...INDUCTIVE), $.keyword)),
      field('name', $.identifier),
      repeat(choice($._term_no_bar, ':')),
      optional(seq(
        ':=',
        optional($.constructor),
        repeat(seq('|', $.constructor)),
      )),
      $._sentence_end,
    ),

    constructor: $ => seq(
      field('name', $.identifier),
      repeat(choice($._term_no_bar, ':', ':=')),
    ),

    _modifier: $ => choice(alias(choice(...MODIFIERS), $.keyword), $.attribute),

    // any other sentence: a command (`Require Import Sandbox.`), a tactic
    // (`intros x.`), a proof sentence (`We conclude that x <= y.`)
    sentence: $ => seq(repeat($._modifier), $._first, repeat($._token), $._sentence_end),

    // what a sentence can start with: not a bullet, a brace or a defining
    // keyword, which are items of their own
    _first: $ => choice(
      $.identifier, $.number, $.string, $.scope,
      $.parenthesized, $.bracketed, $.record, $.match,
      $.jsx_open, $.jsx_close,
    ),

    // a proof's bullets and braces, between sentences
    bullet: $ => $.operator,
    // `{`, or a goal's: `2:{`
    focus: $ => choice(seq(optional(seq(field('goal', $.number), ':')), '{'), '}'),

    // tokens inside a sentence
    _token: $ => choice(
      $._term, ':', ':=',
      alias(choice(...DEFINING, ...INDUCTIVE, ...MODIFIERS), $.keyword),
    ),
    _term: $ => choice($._term_no_bar, '|'),
    _term_no_bar: $ => choice(
      $.identifier, $.number, $.string, $.scope, $.operator, $.dot,
      $.parenthesized, $.bracketed, $.braced, $.record, $.attribute, $.match,
      $.jsx_open, $.jsx_close,
    ),

    parenthesized: $ => seq('(', repeat($._token), ')'),
    bracketed: $ => seq('[', repeat($._token), ']'),
    braced: $ => seq('{', repeat($._token), '}'),
    record: $ => seq('{|', repeat($._token), '|}'),
    attribute: $ => seq('#[', repeat($._token), ']'),
    match: $ => seq(
      field('keyword', alias(choice('match', 'lazymatch', 'multimatch'), $.keyword)),
      repeat($._token),
      field('end', alias('end', $.keyword)),
    ),

    identifier: _ => new RegExp(
      `${IDENT_START}${IDENT_PART}*(\\.${IDENT_START}${IDENT_PART}*)*`, 'u'),

    number: _ => token(choice(
      /0[xX][0-9a-fA-F_]+/,
      /\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?/,
    )),

    // Rocq strings escape a quote by doubling it: "say ""hi"""
    string: _ => /"([^"]|"")*"/,

    // the scope after a term: 12%N, (-3)%Z, "abc"%string
    scope: _ => token(seq('%', new RegExp(`${IDENT_START}${IDENT_PART}*`, 'u'))),

    // ASCII's symbols and Unicode's (∅, ∀, →, ≡, ⊆, ...)
    operator: _ => /[-+*\/\\<>=~^&|!?@$%;,:'#`\p{S}]+/u,

    // JSX: <div className="x"> ... </div>, <br />
    jsx_open: _ => /<[a-z][A-Za-z0-9_]*/,
    jsx_close: _ => /<\/[a-z][A-Za-z0-9_]*>/,

    // after `#lang lisp`: s-expressions, ; comments
    _lisp: $ => choice($.list, $.atom, $.string, $.line_comment),
    list: $ => seq('(', repeat($._lisp), ')'),
    atom: _ => /[^\s()";]+/,
    line_comment: _ => token(seq(';', /[^\n]*/)),
  },
});
