# Coding Guidelines

## Indentation

We use tabs, not spaces.

## Naming Conventions

- Use PascalCase for `type` names
- Use camelCase for `function` and `method` names
- Use camelCase for `property` names and `local variables`
- Use whole words in names when possible

## Comments

- When there are comments for `functions`, `interfaces`, `enums`, and `classes` use JSDoc style comments

## Strings

- Use "double quotes" for strings

## Style

- Use arrow functions `=>` over anonymous function expressions
- Only surround arrow function parameters when necessary. For example, `(x) => x + x` is wrong but the following are correct:

```javascript
x => x + x
(x, y) => x + y
<T>(x: T, y: T) => x === y
```

- Always surround loop and conditional bodies with curly braces
- Open curly braces always go on the same line as whatever necessitates them
- Parenthesized constructs should have no surrounding whitespace. A single space follows commas, colons, and semicolons in those constructs. For example:

```javascript
for (let i = 0, n = str.length; i < 10; i++) {
	if (x < 10) {
		foo();
	}
}

function f(x: number, y: string): void { }
```

## Project Structure

- Use `src` for source code
    - TypeScript types are found in `src/types.ts`
- Use `tests` for test code
    - Test files have the same name as the source file they are testing, but with a `.test.js` suffix
    - Use a `fixtures` subfolder in `tests` for test data files (e.g., prompt files)

## Coding Approach

- Tests should always be updated to reflect the latest changes, especially for new CLI flags or options (e.g., `--prompt-file`)
- The README file should always be updated to document new CLI options and usage examples
- Use `async/await` for asynchronous code
- Use `Promise.all` for parallel asynchronous code
- When adding CLI flags, ensure argument parsing uses camelCase in code and kebab-case for CLI, and map as needed
- Always handle file paths robustly in tests (prefer `path.resolve` for test fixture files)
- `console` can only be used in `cli.js`.
    - Use `console.log` for logging messages to the user
    - Use `console.error` for errors
    - Do not use `console` for debugging (except for temporary debug output during test troubleshooting)

## Commands

- Use `npm test` to run all tests
    - To test an individual file use `npx mocha tests/<test-file>.test.js`
- Use `npm run lint` to run the linter
- Use `npm run fmt` to format the code

## OpenAI API

For OpenAI API calls, we use the Responses API.

Here's an example using CURL:

```shell
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "instructions": "You are a mom of a three-year-old girl.",
    "input": "Tell me a three sentence bedtime story about a unicorn.",
    "previous_response_id": "resp_123456abcdef"
  }'
```

We only use `previous_response_id` when we need to retry the request.

And here's an example response:

```json
{
	"id": "resp_67ccd2bed1ec8190b14f964abc0542670bb6a6b452d3795b",
	"object": "response",
	"created_at": 1741476542,
	"status": "completed",
	"error": null,
	"incomplete_details": null,
	"instructions": null,
	"max_output_tokens": null,
	"model": "gpt-4o-2024-08-06",
	"output": [
		{
			"type": "message",
			"id": "msg_67ccd2bf17f0819081ff3bb2cf6508e60bb6a6b452d3795b",
			"status": "completed",
			"role": "assistant",
			"content": [
				{
					"type": "output_text",
					"text": "In a peaceful grove beneath a silver moon, a unicorn named Lumina discovered a hidden pool that reflected the stars. As she dipped her horn into the water, the pool began to shimmer, revealing a pathway to a magical realm of endless night skies. Filled with wonder, Lumina whispered a wish for all who dream to find their own hidden magic, and as she glanced back, her hoofprints sparkled like stardust.",
					"annotations": []
				}
			]
		}
	],
	"parallel_tool_calls": true,
	"previous_response_id": null,
	"reasoning": {
		"effort": null,
		"summary": null
	},
	"store": true,
	"temperature": 1.0,
	"text": {
		"format": {
			"type": "text"
		}
	},
	"tool_choice": "auto",
	"tools": [],
	"top_p": 1.0,
	"truncation": "disabled",
	"usage": {
		"input_tokens": 36,
		"input_tokens_details": {
			"cached_tokens": 0
		},
		"output_tokens": 87,
		"output_tokens_details": {
			"reasoning_tokens": 0
		},
		"total_tokens": 123
	},
	"user": null,
	"metadata": {}
}
```
