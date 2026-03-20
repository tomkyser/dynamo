// Dynamo > Lib > config.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const DYNAMO_DIR = path.join(os.homedir(), '.claude', 'dynamo');
const CONFIG_PATH = path.join(DYNAMO_DIR, 'config.json');

// --- Validation map for known config keys ---

const VALIDATORS = {
  'reverie.operational.subagent_daily_cap': (v) => typeof v === 'number' && v > 0 && v <= 100,
  'reverie.activation.sublimation_threshold': (v) => typeof v === 'number' && v >= 0 && v <= 1,
  'reverie.activation.decay_rate': (v) => typeof v === 'number' && v >= 0 && v <= 1,
  'reverie.activation.propagation_hops': (v) => typeof v === 'number' && v >= 1 && v <= 3,
  'reverie.activation.convergence_bonus': (v) => typeof v === 'number' && v >= 1 && v <= 3,
  'reverie.activation.domain_frame_bonus': (v) => typeof v === 'number' && v >= 1 && v <= 3,
  'enabled': (v) => typeof v === 'boolean',
};

// --- Functions ---

function get(dotPath, options = {}) {
  const configPath = options.configPath || CONFIG_PATH;
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  const keys = dotPath.split('.');
  let current = config;
  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

function set(dotPath, value, options = {}) {
  const configPath = options.configPath || CONFIG_PATH;

  // Type coercion BEFORE validation
  if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
    value = Number(value);
  }
  if (value === 'true') value = true;
  if (value === 'false') value = false;

  // Validate if known key
  const validationError = validate(dotPath, value);
  if (validationError) throw new Error(validationError);

  // Read, modify, write atomically
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  const keys = dotPath.split('.');
  let current = config;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined || current[keys[i]] === null) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;

  // Atomic write via tmp + rename
  const tmpPath = configPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2) + '\n');
  fs.renameSync(tmpPath, configPath);
  return value;
}

function validate(dotPath, value) {
  const validator = VALIDATORS[dotPath];
  if (!validator) return null; // Unknown keys accepted freely
  if (!validator(value)) {
    return `Invalid value for ${dotPath}: ${JSON.stringify(value)}`;
  }
  return null;
}

function getAll(options = {}) {
  const configPath = options.configPath || CONFIG_PATH;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

module.exports = { get, set, validate, getAll, VALIDATORS, CONFIG_PATH };
