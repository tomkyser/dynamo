// Dynamo > Reverie > activation.cjs
'use strict';

// Pure computation module -- no I/O, no requires beyond Node builtins.
// All inputs via function parameters, all outputs via return values.

// --- Section 1: Entity Extraction (IV-02) ---

const PATTERNS = {
  filePaths: /(?:^|\s|['"`(])([.~]?\/[\w./-]+\.\w{1,10})(?:\s|['"`)]|$)/g,
  functionNames: /\b([a-z][a-zA-Z0-9]*(?:_[a-zA-Z0-9]+)*)\s*\(/g,
  projectNames: /\b(dynamo|reverie|ledger|assay|terminus|switchboard|graphiti)\b/gi,
  classNames: /\b([A-Z][a-zA-Z0-9]+(?:[A-Z][a-zA-Z0-9]*)*)\b/g,
  technicalTerms: /\b(hook|handler|dispatch|activation|sublimation|injection|config|state|session|episode|entity|node|edge|schema|migration|deployment|subagent)\b/gi,
  camelCase: /\b([a-z]+(?:[A-Z][a-z0-9]*)+)\b/g,
  snakeCase: /\b([a-z]+(?:_[a-z0-9]+){2,})\b/g,
};

// Strip system-injected tags before entity extraction.
// These contain task notification metadata, file paths, and memory context
// that would pollute the activation map with noise.
const SYSTEM_TAG_PATTERN = /<(?:system-reminder|task-notification|dynamo-memory-context|local-command-caveat|command-name|command-message|command-args|local-command-stdout)[^>]*>[\s\S]*?<\/(?:system-reminder|task-notification|dynamo-memory-context|local-command-caveat|command-name|command-message|command-args|local-command-stdout)>/gi;

function stripSystemTags(text) {
  return text.replace(SYSTEM_TAG_PATTERN, ' ');
}

function extractEntities(text, options = {}) {
  if (!text || text.length === 0) return [];

  // Strip system-injected blocks before extraction to avoid noise
  text = stripSystemTags(text);

  const entities = new Map(); // normalized name -> { name, type, count, positions }

  for (const [type, pattern] of Object.entries(PATTERNS)) {
    pattern.lastIndex = 0; // CRITICAL: Reset for reuse (Pitfall 6)
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = (match[1] || match[0]).trim();
      if (!name) continue;
      const normalized = name.toLowerCase();
      if (!entities.has(normalized)) {
        entities.set(normalized, { name, type, count: 0, positions: [] });
      }
      const entry = entities.get(normalized);
      entry.count++;
      entry.positions.push(match.index);
    }
  }

  return Array.from(entities.values());
}

// --- Section 2: Domain Frame Classification (IV-10) ---

const FRAME_KEYWORDS = {
  engineering: [
    'implement', 'code', 'function', 'module', 'class', 'method', 'variable',
    'import', 'require', 'export', 'const', 'let', 'async', 'await',
    'test', 'spec', 'build', 'compile', 'deploy', 'install', 'npm', 'node',
    'file', 'directory', 'path', 'write', 'read', 'create', 'add', 'update'
  ],
  debugging: [
    'error', 'bug', 'fix', 'broken', 'fail', 'crash', 'issue', 'problem',
    'debug', 'trace', 'stack', 'exception', 'undefined', 'null', 'nan',
    'not working', 'wrong', 'unexpected', 'incorrect', 'missing', 'typo',
    'timeout', 'hang', 'freeze', 'leak', 'corrupt'
  ],
  architecture: [
    'design', 'architecture', 'pattern', 'structure', 'refactor', 'organize',
    'boundary', 'interface', 'contract', 'dependency', 'coupling', 'cohesion',
    'subsystem', 'layer', 'module', 'component', 'service', 'pipeline',
    'roadmap', 'milestone', 'phase', 'plan', 'spec', 'requirement'
  ],
  social: [
    'remember', 'preference', 'style', 'like', 'prefer', 'always', 'never',
    'convention', 'habit', 'workflow', 'process', 'team', 'collaborate',
    'communication', 'feedback', 'opinion', 'thought', 'feel'
  ],
  // 'general' is the default -- no keywords needed
};

function classifyDomainFrame(text, options = {}) {
  const lower = text.toLowerCase();
  const scores = {};

  for (const [frame, keywords] of Object.entries(FRAME_KEYWORDS)) {
    scores[frame] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[frame]++;
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topFrame = entries[0][1] > 0 ? entries[0][0] : 'general';
  const topScore = entries[0][1];
  const totalKeywords = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalKeywords > 0 ? topScore / totalKeywords : 0.5;

  // Active frames: any frame with score > 0
  const activeFrames = entries.filter(([, s]) => s > 0).map(([f]) => f);
  if (activeFrames.length === 0) activeFrames.push('general');

  return {
    current_frame: topFrame,
    frame_confidence: Math.min(confidence, 1.0),
    active_frames: activeFrames
  };
}

// --- Section 3: Activation Map Operations (IV-03) ---

function updateActivation(activationMap, newEntities, options = {}) {
  const map = { ...activationMap };

  for (const entity of newEntities) {
    const key = entity.name.toLowerCase();
    if (map[key]) {
      map[key] = {
        ...map[key],
        convergence_count: (map[key].convergence_count || 1) + 1,
        last_activated: new Date().toISOString()
      };
    } else {
      map[key] = {
        level: 1.0,
        sources: ['direct_mention'],
        last_activated: new Date().toISOString(),
        convergence_count: 1
      };
    }
  }

  return map;
}

function propagateActivation(anchorEntities, graphData, options = {}) {
  const hops = options.hops || 1;
  const decayFactor = options.decayFactor || 0.5;
  const minThreshold = options.minThreshold || 0.3;
  const convergenceBonus = options.convergenceBonus || 1.5;
  const domainFrameBonus = options.domainFrameBonus || 1.3;
  const domainFrame = options.domainFrame || null;
  const map = {};

  // Initialize anchor entities
  for (const anchor of anchorEntities) {
    map[anchor.id] = {
      level: anchor.level || 1.0,
      sources: ['direct_mention'],
      last_activated: new Date().toISOString(),
      convergence_count: 1
    };
  }

  // BFS propagation
  for (let hop = 0; hop < hops; hop++) {
    const currentIds = Object.keys(map).filter(id => map[id].level >= minThreshold);
    for (const id of currentIds) {
      const neighbors = (graphData && graphData[id]) || [];
      for (const neighbor of neighbors) {
        const propagatedLevel = map[id].level * decayFactor;
        if (propagatedLevel < minThreshold) continue;

        // Apply domain frame bonus if edge matches
        let adjustedLevel = propagatedLevel;
        if (domainFrame && neighbor.domain === domainFrame) {
          adjustedLevel *= domainFrameBonus;
        }

        if (map[neighbor.id]) {
          // Convergent activation: boost existing entry
          map[neighbor.id].level = Math.min(1.0, map[neighbor.id].level + adjustedLevel);
          map[neighbor.id].convergence_count++;
          if (map[neighbor.id].convergence_count >= 2) {
            map[neighbor.id].level = Math.min(1.0, map[neighbor.id].level * convergenceBonus);
          }
          map[neighbor.id].sources.push('association');
        } else {
          map[neighbor.id] = {
            level: Math.min(1.0, adjustedLevel),
            sources: ['association'],
            last_activated: new Date().toISOString(),
            convergence_count: 1
          };
        }
      }
    }
  }

  return map;
}

function decayAll(activationMap, options = {}) {
  const decayRate = options.decayRate || 0.1; // per-minute decay
  const now = options.now || new Date();
  const decayed = {};

  for (const [id, entry] of Object.entries(activationMap)) {
    const lastActivated = new Date(entry.last_activated);
    const minutesElapsed = (now - lastActivated) / 60000;
    const decayMultiplier = Math.exp(-decayRate * minutesElapsed);
    const newLevel = entry.level * decayMultiplier;

    if (newLevel >= 0.01) { // Prune effectively-zero entries
      decayed[id] = {
        ...entry,
        level: newLevel
      };
    }
  }

  return decayed;
}

function checkThresholdCrossings(activationMap, threshold, options = {}) {
  const crossings = [];

  for (const [id, entry] of Object.entries(activationMap)) {
    if (entry.level > threshold) {
      crossings.push({ id, level: entry.level, crossed: true });
    }
  }

  return crossings;
}

// --- Section 4: Scoring (IV-04, IV-12) ---

function computeSublimationScore(entity, predictions, currentContext, cognitiveLoad, options = {}) {
  const activationLevel = entity.level || 0;

  // surprise_factor: how unexpected is this entity given predictions
  const surpriseFactor = options.surpriseFactor !== undefined
    ? options.surpriseFactor
    : computeSurprise(entity, predictions);

  // relevance_ratio: semantic similarity to current context
  const relevanceRatio = options.relevanceRatio !== undefined
    ? options.relevanceRatio
    : computeRelevance(entity, currentContext);

  // cognitive_load_penalty: 0.0 (idle) to 1.0 (maximum)
  const loadPenalty = typeof cognitiveLoad === 'number' ? cognitiveLoad : 0.3;

  // confidence_weight: time-decayed confidence
  const confidenceWeight = options.confidenceWeight !== undefined
    ? options.confidenceWeight
    : 0.8; // Default high confidence in Phase 23

  return activationLevel * surpriseFactor * relevanceRatio * (1 - loadPenalty) * confidenceWeight;
}

function computeSurprise(entity, predictions) {
  if (!predictions || !predictions.expected_topic) return 0.5; // Neutral surprise
  // Keyword overlap proxy: if entity name appears in expected topic, low surprise
  const expected = (predictions.expected_topic || '').toLowerCase();
  const entityName = (entity.name || '').toLowerCase();
  return expected.includes(entityName) ? 0.2 : 0.8;
}

function computeRelevance(entity, currentContext) {
  if (!currentContext) return 0.5; // Neutral relevance
  const context = currentContext.toLowerCase();
  const entityName = (entity.name || '').toLowerCase();
  return context.includes(entityName) ? 0.9 : 0.3;
}

// --- Section 5: Operational Monitoring (OPS-MON-01, OPS-MON-02) ---

function checkSpawnBudget(state, config) {
  const cap = (config.reverie && config.reverie.operational && config.reverie.operational.subagent_daily_cap) || 20;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const tracker = state.processing.spawn_tracker || { date: today, count: 0, rate_limited: false };

  // Reset counter on new day
  if (tracker.date !== today) {
    tracker.date = today;
    tracker.count = 0;
    tracker.rate_limited = false;
  }

  return {
    allowed: tracker.count < cap && !tracker.rate_limited,
    remaining: Math.max(0, cap - tracker.count),
    rate_limited: tracker.rate_limited,
    tracker
  };
}

function recordSpawn(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.processing.spawn_tracker) {
    state.processing.spawn_tracker = { date: today, count: 0, rate_limited: false };
  }
  state.processing.spawn_tracker.count++;
  return state;
}

function setRateLimited(state, limited) {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.processing.spawn_tracker) {
    state.processing.spawn_tracker = { date: today, count: 0, rate_limited: false };
  }
  state.processing.spawn_tracker.rate_limited = limited;
  return state;
}

// --- Exports ---

module.exports = {
  extractEntities,
  stripSystemTags,
  propagateActivation,
  decayAll,
  computeSublimationScore,
  computeSurprise,
  computeRelevance,
  classifyDomainFrame,
  checkThresholdCrossings,
  checkSpawnBudget,
  recordSpawn,
  setRateLimited,
  updateActivation,
  PATTERNS,
  FRAME_KEYWORDS,
  SYSTEM_TAG_PATTERN
};
