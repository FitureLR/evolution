/**
 * entry
 */

// import { render } from "../dom/index";

const sum = (a: number, b: number) => {
  return a + b;
};

function logObj(obj: any) {
  return obj?.name;
}

module.exports = {
  sum,
  logObj,
};
