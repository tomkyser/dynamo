'use strict';

const result = require('./result.cjs');
const contract = require('./contract.cjs');
const schema = require('./schema.cjs');
const paths = require('./paths.cjs');
const config = require('./config.cjs');

module.exports = {
  // result.cjs
  ok: result.ok,
  err: result.err,
  isOk: result.isOk,
  isErr: result.isErr,
  unwrap: result.unwrap,

  // contract.cjs
  createContract: contract.createContract,

  // schema.cjs
  validate: schema.validate,

  // paths.cjs
  discoverRoot: paths.discoverRoot,
  createPaths: paths.createPaths,
  getPaths: paths.getPaths,

  // config.cjs
  loadConfig: config.loadConfig,
  deepMerge: config.deepMerge,
  envToConfig: config.envToConfig,
};
