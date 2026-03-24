'use strict';

/**
 * Generates top-level help text listing all registered commands.
 *
 * @param {Map<string, {description: string}>} commands - Command registry map
 * @returns {string} Formatted help text
 */
function generateHelp(commands) {
  let output = 'Usage: dynamo <command> [options]\n\nCommands:\n';

  const names = [...commands.keys()].sort();
  for (const name of names) {
    const meta = commands.get(name);
    const padded = name.padEnd(20);
    output += `  ${padded}  ${meta.description || ''}\n`;
  }

  output += '\nRun "dynamo <command> --help" for command-specific help.\n';
  return output;
}

/**
 * Generates help text for a specific command.
 *
 * @param {string} name - Command name
 * @param {{description: string, flags?: Object}} meta - Command metadata
 * @returns {string} Formatted command help text
 */
function generateCommandHelp(name, meta) {
  let output = `Usage: dynamo ${name} [options]\n\n${meta.description || ''}\n`;

  if (meta.flags && Object.keys(meta.flags).length > 0) {
    output += '\nOptions:\n';
    for (const [flagName, flag] of Object.entries(meta.flags)) {
      const desc = flag.description || flag.type || '';
      output += `  --${flagName}  ${desc}\n`;
    }
  }

  return output;
}

module.exports = { generateHelp, generateCommandHelp };
