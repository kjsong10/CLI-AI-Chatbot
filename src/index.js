#!/usr/bin/env node
import 'dotenv/config';
import OpenAI from 'openai';
import readline from 'readline';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();
program
  .name('cli-ai-chatbot')
  .description('Interactive CLI AI Chatbot powered by OpenRouter with markdown and typing animation')
  .option('-m, --model <model>', 'OpenRouter model', 'openai/gpt-oss-20b:free')
  .option('-s, --system <system>', 'System prompt', 'You are a helpful assistant.')
  .option('--no-render', 'Disable final pretty markdown render (keep only typing stream)')
  .option('--no-typing', 'Disable typing animation')
  .option('--no-emoji', 'Disable emoji in markdown rendering')
  .option('--speed <ms>', 'Typing delay per character in ms (0 to disable)', (v) => parseInt(v, 10), 6)
  .parse(process.argv);

const options = program.opts();

// Configure marked after flags are parsed so we honor --no-emoji and width
marked.setOptions({
  renderer: new TerminalRenderer({
    emoji: options.emoji !== false,
    width: process.stdout.columns || 80,
  }),
});

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error(chalk.red('Missing OPENROUTER_API_KEY. Create a .env with OPENROUTER_API_KEY=...'));
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    // Optional but recommended by OpenRouter
    'HTTP-Referer': 'https://github.com/yourname/CLI-AI-Chatbot',
    'X-Title': 'CLI AI Chatbot',
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.gray('You > '),
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const effectiveSpeed = (!process.stdout.isTTY || options.typing === false)
  ? 0
  : Number.isFinite(options.speed) ? Math.max(0, options.speed) : 6;

async function typeOut(text, delayMs = effectiveSpeed) {
  if (!text) return;
  if (delayMs <= 0) {
    process.stdout.write(text);
    return;
  }
  for (const char of text) {
    process.stdout.write(char);
    await sleep(delayMs);
  }
}

async function main() {
  console.log(chalk.cyanBright('Interactive CLI AI Chatbot (OpenRouter)'));
  console.log(chalk.gray(`Model: ${options.model}`));
  console.log(chalk.gray('Type /exit to quit, /clear to reset conversation.'));
  console.log('');

  /** @type {{ role: 'system'|'user'|'assistant', content: string }[]} */
  const messages = [{ role: 'system', content: options.system }];

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === '/exit') {
      rl.close();
      return;
    }

    if (input === '/clear') {
      messages.splice(1); // keep system message
      console.log(chalk.yellow('Conversation cleared.'));
      rl.prompt();
      return;
    }

    messages.push({ role: 'user', content: input });

    try {
      const stream = await client.chat.completions.create({
        model: options.model,
        messages,
        stream: true,
      });

      process.stdout.write(chalk.green('\nAssistant > '));

      let assistantText = '';
      for await (const part of stream) {
        const token = part?.choices?.[0]?.delta?.content || '';
        assistantText += token;
        await typeOut(token);
      }

      process.stdout.write('\n');

      messages.push({ role: 'assistant', content: assistantText });

      if (options.render) {
        console.log(chalk.gray('\n— Rendered Markdown —'));
        console.log(marked.parse(assistantText));
      }
    } catch (err) {
      console.error('\n' + chalk.red('Error from OpenRouter:'), err?.message || err);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye!'));
    process.exit(0);
  });

  // Cross-platform Ctrl+C/SIGTERM handling
  process.on('SIGINT', () => {
    rl.close();
  });
  process.on('SIGTERM', () => {
    rl.close();
  });
}

main();


