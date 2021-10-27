/**
 * entry
 */
// import { render } from "../dom/index";
var sum = function (a, b) {
    return a + b;
};
function logObj(obj) {
    return obj === null || obj === void 0 ? void 0 : obj.name;
}
module.exports = {
    sum: sum,
    logObj: logObj
};
