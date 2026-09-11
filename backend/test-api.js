// Verifies the Anthropic API connection works before anything else is built.
// Run from the project root: node backend/test-api.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Anthropic = require('@anthropic-ai/sdk');

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ERROR: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.'
    );
    process.exit(1);
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Say "API connection successful" and nothing else.' },
      ],
    });
    console.log(response.content[0].text);
  } catch (err) {
    console.error('ERROR: API call failed:', err.message);
    process.exit(1);
  }
}

main();
