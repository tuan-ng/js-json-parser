# Parsing JSON

We're writing a JSON parser, following almost identically _Douglas Crockford_,
but using _ES6_ and making the code a bit easier to read. Plus we'll have a
some explaination, including having a grammar to guide our understanding of the
code.

```
<json value> := <object>
             := <array>
             := <string>
             := <number>
             := <word>

<object>     := "{" { <key> ":" <json value> }(,*) "}"
<key>        := <string>

<array>      := "[" { <json value> }(,*) "]"

<string>     := """ { <character> } """
<character>  := "\\"  "u" <uffff>
             := "\\" <escapees>
             := <keyboard character>
<uffff>      := <hex>
<hex>        := <digit> | "a" ... "f"
<escapes>    := """ | "\\" | "b" | "f" | "n" | "r" | "t"

<number>     := ["-"] { <digit> } ["." {<digit>} ] [["e"|"E"] ["-"| "+"] { <digit> }]

<word>       := "true" | "false" | "null"
```

We have used some special notations, e.g. between `{` and `}` means zero or
more (which simply translates to a loop in the code), between `[` and `]` means
optional (which translates to a conditional in the code), and between `{` and
`}(,*)` means zero, one, or two or more separated by commas.

### The Parser

##### Initial Steps

The three items basic to parsing are the current location, the current
character, and the text to be parsed. They're `at`, `ch`, and `text` in the
function `json_parse` below.

We'll have the function `error` to throw a `SyntaxError`, together
with a message, the location, and the text.

We'll also have the function `next`, which is actuallly a combination of
`consume` and `next`. If `next` is given a character, it behaves like
`consume`, i.e. it checks if `ch` is the given character, returns the character
at `at`, and moves at one place ahead; otherwise it only returns the character
at `at` and moves at one place ahead.

At this time, we'll return a function that initializes `text`, `at`, and
`ch` and simply returns the source text.

```js
const json_parse = (() => {
  let at, ch, text;

  const error = m => {
    throw {
      name: 'SyntaxError',
      message: m,
      at: at,
      text: text
    };
  };

  const next = c => {
    if (c && c !== ch) {
      error("Expect '" + c + "' instead of '" + ch + "'");
    }

    ch = text.charAt(at);
    at += 1;
    return ch;
  };

  return (source, reviver) => {
    text = source;
    at = 0;
    ch = ' ';
    return text;
  };
})();

module.exports = json_parse;
```

##### Following the grammar

We're writing a recursive-descent parser. We'll be parsing an object if
we meet a `{`, an array if `[`, a string if `"`, a number if `-` or a
digit, and otherwise a word:

```js
// A JSON value is either an object, an array, a string, a number, or
// a word (true, false, null)
const value = () => {
  white();
  switch (ch) {
    case '{':
      return object();
    case '[':
      return array();
    case '"':
      return string();
    case '-':
      return number();
    default:
      return ch >= '0' && ch <= '9' ? number() : word();
  }
};
```

where

```js
// Skip whitespace.
const white = () => {
  while (ch && ch <= ' ') {
    next();
  }
};
```

The grammar for an object indicates that there're three possible cases. Either
we have an empty object, or an object with exactly one key-value pair, or
an object with two or more key-value pairs separated by commas. Thus:

```js
// Parse an object value
const object = () => {
  let object = {};

  if (ch === '{') {
    next('{');
    white();
    if (ch === '}') {
      next('}');
      return object; // empty object
    }
    while (ch) {
      const key = string();
      white();
      next(':');
      object[key] = value();
      white();
      if (ch === '}') {
        next('}');
        return object;
      }
      next(',');
      white();
    }
  }
  error('Bad object');
};
```

Parsing an array follows exactly the same idea. The rest of the parser
proceeds similarly.

##### The reviver function

This is the description of the reviver function that is to be supplied as an
optional argument to the parse function:

> If a reviver is specified, the value computed by parsing is transformed
> before being returned. Specifically, the computed value and all its properties
> (beginning with the most nested properties and proceeding to the original value
> itself) are individually run through the reviver. Then it is called, with the
> object containing the property being processed as this, and with the property
> name as a string, and the property value as arguments. If the reviver function
> returns undefined (or returns no value, for example, if execution falls off the
> end of the function), the property is deleted from the object. Otherwise, the
> property is redefined to be the return value.

Given this, we'll have a `walk` function:

```js
const walk = (holder, key) => {
  const value = holder[key];
  if (value && typeof value === 'object') {
    let k, v;
    for (k in value) {
      if (Object.hasOwnProperty.call(value, k)) {
        v = walk(value, k);
        if (v !== undefined) {
          value[k] = v;
        } else {
          delete value[k];
        }
      }
    }
  }
  return reviver.call(holder, key, value);
};
```
