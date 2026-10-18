const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");

// Load the real CommonJS source with isolated test substitutes.
// Production files keep the ordinary require/module.exports pattern used in Budget.
function loadModule(file, replacements = {}, globals = {}) {
  const filename = path.resolve(__dirname, file);
  const localRequire = createRequire(filename);
  const requireForTest = (name) => Object.hasOwn(replacements, name) ? replacements[name] : localRequire(name);
  const module = { exports: {} };
  const args = ["exports", "require", "module", "__filename", "__dirname", ...Object.keys(globals)];
  const body = fs.readFileSync(filename, "utf8");
  const execute = vm.runInThisContext(`(function (${args.join(",")}) {\n${body}\n})`, { filename });
  execute(module.exports, requireForTest, module, filename, path.dirname(filename), ...Object.values(globals));
  return module.exports;
}

module.exports = { loadModule };
