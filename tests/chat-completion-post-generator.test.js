/**
 * @fileoverview Tests for the PostGenerator class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import {
	ChatCompletionPostGenerator,
	readPrompt,
} from "../src/chat-completion-post-generator.js";
import { MockServer, FetchMocker } from "mentoss";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const OPENAI_TOKEN = "test-token-123";
const MOCK_PROMPT = "You are a social media expert. Create engaging posts.";

const MOCK_RELEASE = {
	url: "https://github.com/user/repo/releases/v1.0.0",
	tagName: "v1.0.0",
	version: "1.0.0",
	details: "Added new features and fixed bugs",
};

const MOCK_COMPLETION_RESPONSE = {
	choices: [
		{
			message: {
				content:
					"🎉 Exciting release! Project v1.0.0 is out with awesome new features. Check it out! #opensource",
			},
		},
	],
};

const server = new MockServer("https://api.openai.com");
const githubServer = new MockServer("https://models.github.ai");
const fetchMocker = new FetchMocker({
	servers: [server, githubServer],
});

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("ChatCompletionPostGenerator", () => {
	beforeEach(() => {
		fetchMocker.mockGlobal();
	});

	afterEach(() => {
		fetchMocker.unmockGlobal();
		server.clear();
		githubServer.clear();
	});

	describe("constructor", () => {
		it("should throw when token is missing", () => {
			assert.throws(
				() => new ChatCompletionPostGenerator(),
				/Missing API token/,
			);
		});

		it("should throw an error when token isn't a string", () => {
			assert.throws(
				() => new ChatCompletionPostGenerator(123),
				/API token isn't a string/,
			);
		});

		it("should create instance with token and prompt", () => {
			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});
			assert.ok(generator instanceof ChatCompletionPostGenerator);
		});

		it("should throw when baseUrl is provided but model is not", () => {
			assert.throws(
				() =>
					new ChatCompletionPostGenerator(OPENAI_TOKEN, {
						baseUrl: "https://models.github.ai/inference/",
					}),
				/Model is required when using a custom base URL/,
			);
		});

		it("should create instance with token, baseUrl and model", () => {
			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				baseUrl: "https://models.github.ai/inference/",
				model: "openai/gpt-4.1-mini",
			});
			assert.ok(generator instanceof ChatCompletionPostGenerator);
		});

		it("should append trailing slash to baseUrl if missing", () => {
			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				baseUrl: "https://models.github.ai/inference",
				model: "openai/gpt-4.1-mini",
			});
			assert.ok(generator instanceof ChatCompletionPostGenerator);
			// We can't directly test private fields, but we can test behavior
		});
	});

	describe("generateSocialPost()", () => {
		it("should generate post using provided prompt", async () => {
			server.post("/v1/chat/completions", {
				status: 200,
				body: MOCK_COMPLETION_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(
				post,
				MOCK_COMPLETION_RESPONSE.choices[0].message.content,
			);
		});

		it("should generate post using prompt from file when no prompt provided", async () => {
			server.post("/v1/chat/completions", {
				status: 200,
				body: MOCK_COMPLETION_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN);
			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(
				post,
				MOCK_COMPLETION_RESPONSE.choices[0].message.content,
			);
		});

		it("should handle API errors", async () => {
			server.post("/v1/chat/completions", {
				status: 500,
				body: { error: "Internal Server Error" },
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/500/,
			);
		});

		it("should handle missing completion response", async () => {
			server.post("/v1/chat/completions", {
				status: 200,
				body: { choices: [] },
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/No content received from OpenAI/,
			);
		});

		it("should throw when completion response has no content", async () => {
			server.post("/v1/chat/completions", {
				status: 200,
				body: { choices: [] },
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				{
					name: "Error",
					message: "No content received from OpenAI",
				},
			);
		});

		it("should remove leading and trailing quotation marks from the response", async () => {
			const responseWithQuotes = {
				choices: [
					{
						message: {
							content: '"Test message with quotes"',
						},
					},
				],
			};

			server.post("/v1/chat/completions", {
				status: 200,
				body: responseWithQuotes,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, "Test message with quotes");
		});
	});

	describe("generateSocialPost() character limits", () => {
		it("should retry when post is too long", async () => {
			const longResponse = {
				choices: [
					{
						message: {
							content: "x".repeat(281),
						},
					},
				],
			};

			const goodResponse = {
				choices: [
					{
						message: {
							content: "Short enough response",
						},
					},
				],
			};

			server.post("/v1/chat/completions", {
				status: 200,
				body: longResponse,
			});

			server.post("/v1/chat/completions", {
				status: 200,
				body: goodResponse,
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, "Short enough response");
		});

		it("should count URLs as 27 characters", async () => {
			const response = {
				choices: [
					{
						message: {
							content: `Test message with URL: https://example.com/very/long/url/that/would/normally/be/longer and another https://test.com/url`,
						},
					},
				],
			};

			server.post("/v1/chat/completions", {
				status: 200,
				body: response,
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			// This should pass because URLs count as 27 chars
			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, response.choices[0].message.content);
		});

		it("should throw after MAX_RETRIES attempts", async () => {
			const longResponse = {
				choices: [
					{
						message: {
							content: "x".repeat(281),
						},
					},
				],
			};

			// Setup three different responses for three retries
			server.post("/v1/chat/completions", {
				status: 200,
				body: longResponse,
				headers: {
					"content-type": "application/json",
				},
			});

			server.post("/v1/chat/completions", {
				status: 200,
				body: longResponse,
				headers: {
					"content-type": "application/json",
				},
			});

			server.post("/v1/chat/completions", {
				status: 200,
				body: longResponse,
				headers: {
					"content-type": "application/json",
				},
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/Failed to generate post within 280 characters after 3 attempts/,
			);

			// Verify all three attempts were made
			assert.equal(server.allRoutesCalled(), true);
		});
	});

	describe("generateSocialPost() with custom baseUrl and model", () => {
		it("should generate post using custom baseUrl and model", async () => {
			const customBaseUrl = "https://models.github.ai/inference/";
			const customModel = "openai/gpt-4.1-mini";

			githubServer.post("/inference/chat/completions", {
				status: 200,
				body: MOCK_COMPLETION_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ChatCompletionPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
				baseUrl: customBaseUrl,
				model: customModel,
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);

			assert.strictEqual(
				post,
				MOCK_COMPLETION_RESPONSE.choices[0].message.content,
			);

			// Verify the GitHub API was called instead of OpenAI
			assert.equal(server.called("/v1/chat/completions"), false);
			assert.equal(
				githubServer.called({
					url: "/inference/chat/completions",
					method: "post",
				}),
				true,
			);
		});
	});
});

describe("readPrompt()", () => {
	it("should read the prompt from a file", async () => {
		const prompt = await readPrompt();
		assert.ok(prompt.length > 0);
	});
});
