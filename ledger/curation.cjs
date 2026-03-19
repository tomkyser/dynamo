// Dynamo > Ledger > curation.cjs
'use strict';

const path = require('path');
const fs = require('fs');

const resolve = require('../lib/resolve.cjs');
const { loadConfig, fetchWithTimeout, logError, loadPrompt } = require(resolve('dynamo', 'core.cjs'));

const config = loadConfig();

/**
 * Shared low-level function to call Haiku via OpenRouter.
 * Returns { text, uncurated } -- uncurated=true means API was unavailable.
 */
async function callHaiku(promptName, variables, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { text: variables.fallback || '', uncurated: true };
  }

  const prompt = loadPrompt(promptName);
  if (!prompt) {
    logError(options.hookName || 'curation', 'Prompt not found: ' + promptName);
    return { text: variables.fallback || '', uncurated: true };
  }

  // Interpolate variables into prompt.user
  let userContent = prompt.user;
  for (const [key, value] of Object.entries(variables)) {
    if (key === 'fallback') continue;
    const strValue = (typeof value === 'object') ? JSON.stringify(value, null, 2) : String(value);
    userContent = userContent.replace(new RegExp('\\{' + key + '\\}', 'g'), strValue);
  }

  const timeout = options.timeout || config.timeouts.curation;
  const maxTokens = options.maxTokens || 500;

  try {
    const resp = await fetchWithTimeout(config.curation.api_url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.curation.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: userContent }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      })
    }, timeout);

    if (!resp.ok) {
      logError(options.hookName || 'curation', 'HTTP ' + resp.status + ' from ' + config.curation.api_url);
      return { text: variables.fallback || '', uncurated: true };
    }

    const data = await resp.json();
    const text = data.choices[0].message.content;
    return { text, uncurated: false };
  } catch (err) {
    logError(options.hookName || 'curation', 'callHaiku error: ' + err.message);
    return { text: variables.fallback || '', uncurated: true };
  }
}

/**
 * Curate search results through Haiku for relevance filtering.
 */
async function curateResults(memories, contextText, options = {}) {
  if (!memories) return '';

  const apiKey = process.env.OPENROUTER_API_KEY;
  const memoriesStr = (typeof memories === 'object') ? JSON.stringify(memories, null, 2) : String(memories);

  if (!apiKey) {
    return '[uncurated]\n' + memoriesStr.slice(0, 500);
  }

  const result = await callHaiku('curation', {
    memories: memoriesStr,
    project_name: options.projectName || 'unknown',
    session_type: options.sessionType || 'startup',
    prompt: contextText || '',
    fallback: '[uncurated]\n' + memoriesStr.slice(0, 500)
  }, options);

  return result.text;
}

/**
 * Summarize text through Haiku for session summaries.
 */
async function summarizeText(text, options = {}) {
  const result = await callHaiku('session-summary', {
    context: text,
    fallback: text.slice(0, 200)
  }, { ...options, maxTokens: 300, timeout: config.timeouts.summarization });

  return result.text;
}

/**
 * Generate a concise 3-5 word session name via Haiku.
 */
async function generateSessionName(summaryText, options = {}) {
  const result = await callHaiku('session-name', {
    context: summaryText,
    fallback: ''
  }, { ...options, maxTokens: 50 });

  return result.text.trim();
}

module.exports = { callHaiku, curateResults, summarizeText, generateSessionName };
