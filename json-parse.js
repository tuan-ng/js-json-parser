const json_parse = (() => {
  let at, ch, text;

  const error = m => {
    throw {
      name: "SyntaxError",
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

  // Skip whitespace.
  const white = () => {
    while (ch && ch <= " ") {
      next();
    }
  };

  // Parse a word: true, false, null
  const word = () => {
    switch (ch) {
      case "t":
        next("t");
        next("r");
        next("u");
        next("e");
        return true;
      case "f":
        next("f");
        next("a");
        next("l");
        next("s");
        next("e");
        return false;
      case "n":
        next("n");
        next("u");
        next("l");
        next("l");
        return null;
    }
    error("Unexpected '" + ch + "'");
  };

  // Parse a number value
  const number = () => {
    let string = "";

    if (ch === "-") {
      string = "-";
      next("-");
    }
    while (ch >= "0" && ch <= "9") {
      string += ch;
      next();
    }

    if (ch === ".") {
      string += ".";
      while (next() && ch >= "0" && ch <= "9") {
        string += ch;
      }
    }
    if (ch === "e" || ch === "E") {
      string += ch;
      next();
      if (ch === "-" || ch === "+") {
        string += ch;
        next();
      }
      while (ch >= "0" && ch <= "9") {
        string += ch;
        next();
      }
    }
    const number = +string;
    if (isNaN(number)) {
      error("Bad number");
    } else {
      return number;
    }
  };

  // Parse a string value
  const string = () => {
    let string = "";

    if (ch === '"') {
      while (next()) {
        if (ch === '"') {
          next();
          return string; // empty string
        } else if (ch === "\\") {
          next();
          if (ch === "u") {
            let uffff = 0;
            for (let i = 0; i < 4; i += 1) {
              const hex = parseInt(next(), 16);
              if (!isFinite(hex)) {
                break;
              }
              uffff = uffff * 16 + hex;
            }
            string += String.fromCharCode(uffff);
          } else if (typeof escapee[ch] === "string") {
            string += escapee[ch];
          } else {
            break;
          }
        } else {
          string += ch;
        }
      }
    }
    error("Bad string");
  };

  // Parse an array value
  const array = () => {
    let array = [];

    if (ch === "[") {
      next("[");
      white();
      if (ch === "]") {
        next("]");
        return array; // empty array
      }
      while (ch) {
        array.push(value());
        white();
        if (ch === "]") {
          next("]");
          return array;
        }
        next(",");
        white();
      }
    }
    error("Bad array");
  };

  // Parse an object value
  const object = () => {
    let object = {};

    if (ch === "{") {
      next("{");
      white();
      if (ch === "}") {
        next("}");
        return object; // empty object
      }
      while (ch) {
        const key = string();
        white();
        next(":");
        object[key] = value();
        white();
        if (ch === "}") {
          next("}");
          return object;
        }
        next(",");
        white();
      }
    }
    error("Bad object");
  };

  // A JSON value is either an object, an array, a string, a number, or
  // a word (true, false, null)
  const value = () => {
    white();
    switch (ch) {
      case "{":
        return object();
      case "[":
        return array();
      case '"':
        return string();
      case "-":
        return number();
      default:
        return ch >= "0" && ch <= "9" ? number() : word();
    }
  };

  return (source, reviver) => {
    text = source;
    at = 0;
    ch = " ";

    const result = value();
    white();
    if (ch) {
      error("Syntax error");
    }

    const walk = (holder, key) => {
      const value = holder[key];
      if (value && typeof value === "object") {
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

    return typeof reviver === "function" ? walk({ "": result }, "") : result;
  };
})();

module.exports = json_parse;
