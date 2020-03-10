const json_parse = require('./json-parse');

test('a number is parsed to a number', () => {
  expect(json_parse('1')).toBe(1);
});

test('a string is parsed to a string', () => {
  expect(json_parse('"hello"')).toBe('hello');
});

test('an array is parsed to an array', () => {
  expect(json_parse('[1, 2, 3]')).toEqual([1, 2, 3]);
});

test('an object is parsed to an object', () => {
  expect(json_parse('{"a": 1, "b": 2}')).toEqual({ a: 1, b: 2 });
});

test('an object is parsed to an object called with a reviver', () => {
  expect(
    json_parse('{"a": 1, "b": 2}', (k, v) => {
      return typeof v === 'number' ? v * 1000 : v;
    })
  ).toEqual({ a: 1000, b: 2000 });
});
