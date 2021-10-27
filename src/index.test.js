/**
 * CopyLeft
 * test index.js
 */
const { sum, logObj } = require("./index");

test("adds 1 + 2 to equal 3", () => {
  expect(sum(1, 2)).toBe(3);
});

test("log obj propety name", () => {
  expect(logObj(null)).toBe(undefined);
});
