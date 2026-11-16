; Soma's highlights. Earlier patterns take precedence over later ones (as
; tree-sitter highlight reads them), so the specific come first.

(doc_comment) @comment.documentation
(comment) @comment
(line_comment) @comment
(string) @string
(number) @number
(scope) @attribute
(lang_line) @keyword.directive

; definitions: their names, an Inductive's type and constructors
(definition name: (identifier) @function)
(inductive name: (identifier) @type)
(constructor name: (identifier) @constructor)
(keyword) @keyword

; Waterproof's proof sentences: Take x : nat. We conclude that ...
(sentence
  .
  (identifier) @keyword
  (#any-of? @keyword
    "Take" "Assume" "We" "By" "Choose" "Since" "It" "Then" "Either"
    "Obtain" "Define" "Expand" "Use" "Write"))
; and the word after the first: We conclude, Assume that, It suffices
; (both words must be in this list)
(sentence
  .
  (identifier) @keyword
  .
  (identifier) @keyword
  (#any-of? @keyword
    "We" "Assume" "It" "By" "conclude" "need" "consider" "use" "know"
    "claim" "argue" "show" "that" "suffices" "may" "prove"))

; commands and tactics' structure
((identifier) @keyword
  (#any-of? @keyword
    "Require" "Import" "Export" "From" "Open" "Close" "Scope" "Proof" "Qed"
    "Defined" "Admitted" "Abort" "End" "Notation" "Infix" "Arguments"
    "Implicit" "Hint" "Fail" "Compute" "Eval" "Check" "Print" "Search"
    "Set" "Unset" "Rocq" "Library" "Transparent" "Opaque" "Context"
    "Variables" "Hypotheses" "Parameters" "Axioms" "Existing" "Scheme"
    "Declare" "Ltac2" "Obligation" "Next" "Goal" "Show"))
((identifier) @keyword
  (#any-of? @keyword
    "with" "fun" "let" "in" "if" "then" "else" "return" "as" "forall"
    "exists" "fix" "cofix" "struct" "where"))

; Soma's gradual typing
((identifier) @function.builtin (#any-of? @function.builtin "unk" "raise" "cast"))
((identifier) @type.builtin
  (#any-of? @type.builtin
    "Any" "Type" "Prop" "SProp" "nat" "N" "Z" "Q" "bool" "string" "ascii"
    "list" "option" "prod" "sum" "unit" "io"))
((identifier) @constant.builtin
  (#any-of? @constant.builtin "true" "false" "tt" "None" "Some" "nil" "eq_refl"))

(attribute) @attribute
(jsx_open) @tag
(jsx_close) @tag
(bullet) @punctuation.special
(focus) @punctuation.bracket
(dot) @punctuation.delimiter
(operator) @operator
[":" ":=" "|"] @operator
["(" ")" "[" "]" "{" "}" "{|" "|}" "#["] @punctuation.bracket

; after #lang lisp
(list
  .
  (atom) @keyword
  (#any-of? @keyword "define" "define-any" "lambda" "if" "let" "match"))
((atom) @number (#match? @number "^-?[0-9]+$"))
((atom) @boolean (#any-of? @boolean "#t" "#f"))
