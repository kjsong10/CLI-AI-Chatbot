## CLI AI Chatbot (OpenRouter)

Interactive terminal chatbot using OpenRouter as the LLM provider, with streaming, markdown rendering, and a typing animation.

### Setup

1. Create a `.env` file:

```
OPENROUTER_API_KEY=your_key_here
```

2. Install dependencies:

```
npm install
```

3. Run:

```
npm start
```

Or install globally for a `cli-ai-chatbot` command:

```
npm install -g .
cli-ai-chatbot
```

### Usage

- Type your prompt and press Enter.
- Commands:
  - `/clear`: reset conversation
  - `/exit`: quit

Options:

```
cli-ai-chatbot --model openrouter/auto \
  --system "You are a helpful assistant."
```

### Notes

- Uses `openai` SDK pointed at `https://openrouter.ai/api/v1`.
- Renders markdown to terminal via `marked` + `marked-terminal`.
- Streams tokens with a simple typing animation.


