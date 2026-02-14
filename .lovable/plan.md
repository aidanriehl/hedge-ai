

# Integrate Claude Opus 4.5 for Research and Chat

## Overview
Replace the main research analysis and chat models with Anthropic's Claude Opus 4.5, while keeping the fast/cheap models for step generation (Gemini Flash Lite) and image generation (Gemini Flash Image).

## Step 1: Store the API Key
Use the secure secrets tool to request your Anthropic API key. This will be stored securely and only accessible from backend functions.

## Step 2: Update the Backend Function

Modify `supabase/functions/bet-research/index.ts` to call the Anthropic Messages API directly for two modes:

**Main Research** (currently `google/gemini-2.5-flash`):
- Call `https://api.anthropic.com/v1/messages` with `claude-opus-4-5-20250514`
- Keep the same system prompt and JSON output format
- Parse the response from Anthropic's format (`content[0].text`) instead of OpenAI format

**Chat** (currently `openai/gpt-5-mini`):
- Same Anthropic endpoint and model
- Convert chat history to Anthropic's message format
- Keep the same system prompt

**Unchanged:**
- Step generation stays on `google/gemini-2.5-flash-lite` (fast, cheap)
- More Research stays on `google/gemini-2.5-flash`
- Image generation stays on `google/gemini-2.5-flash-image`

## Technical Details

### Anthropic API differences from OpenAI format:
- System prompt goes in a separate `system` field, not in messages array
- Response is in `content[0].text` instead of `choices[0].message.content`
- Uses `x-api-key` header instead of `Authorization: Bearer`
- Uses `max_tokens` (required) instead of optional
- Model ID: `claude-opus-4-5-20250514`

### Changes to `bet-research/index.ts`:
- Add a helper function `callAnthropic(system, messages, maxTokens)` that handles the Anthropic API call
- In the main research section: replace the Lovable AI gateway call with `callAnthropic()`
- In the chat section: replace the gateway call with `callAnthropic()`, converting chat history format
- Read `ANTHROPIC_API_KEY` from `Deno.env.get()`

### No frontend changes needed
The response format stays identical -- only the backend model changes.
