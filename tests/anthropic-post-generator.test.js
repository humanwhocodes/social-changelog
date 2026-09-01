/**
 * @fileoverview Tests for the AnthropicPostGenerator class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import {
	AnthropicPostGenerator,
	readPrompt,
} from "../src/anthropic-post-generator.js";
import { MockServer, FetchMocker } from "mentoss";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const ANTHROPIC_TOKEN = "test-token-123";
const MOCK_PROMPT = "You are a social media expert. Create engaging posts.";

const MOCK_RELEASE = {
	url: "https://github.com/user/repo/releases/v1.0.0",
	tagName: "v1.0.0",
	version: "1.0.0",
	details: "Added new features and fixed bugs",
};

const MOCK_RESPONSE = {
	id: "msg_123",
	type: "message",
	role: "assistant",
	model: "claude-haiku-4-5",
	content: [
		{
			type: "text",
			text: "🎉 Exciting release! Project v1.0.0 is out with awesome new features. Check it out! #opensource",
		},
	],
	stop_reason: "end_turn",
	stop_sequence: null,
	usage: { input_tokens: 10, output_tokens: 20 },
};

const server = new MockServer("https://api.anthropic.com");
const fetchMocker = new FetchMocker({
	servers: [server],
});

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("AnthropicPostGenerator", () => {
	beforeEach(() => {
		fetchMocker.mockGlobal();
	});

	afterEach(() => {
		fetchMocker.unmockGlobal();
		server.clear();
	});

	describe("constructor", () => {
		it("should throw when token is missing", () => {
			assert.throws(
				() => new AnthropicPostGenerator(),
				/Missing Anthropic API token/,
			);
		});

		it("should throw an error when token isn't a string", () => {
			assert.throws(
				() => new AnthropicPostGenerator(123),
				/Anthropic API token isn't a string/,
			);
		});

		it("should create instance with token and prompt", () => {
			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
				prompt: MOCK_PROMPT,
			});
			assert.ok(generator instanceof AnthropicPostGenerator);
		});
	});

	describe("generateSocialPost()", () => {
		it("should generate post using provided prompt and default model", async () => {
			server.post("/v1/messages", {
				status: 200,
				body: MOCK_RESPONSE,
				headers: {
					"content-type": "application/json",
					"x-api-key": ANTHROPIC_TOKEN,
				},
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, MOCK_RESPONSE.content[0].text);
			assert.ok(
				server.called({
					method: "POST",
					url: "/v1/messages",
					body: {
						model: "claude-haiku-4-5",
						max_tokens: 1024,
						system: MOCK_PROMPT,
						messages: [
							{
								role: "user",
								content: `Create a post summarizing this release for testproject ${MOCK_RELEASE.version}: ${MOCK_RELEASE.details}\n\nURL is ${MOCK_RELEASE.url}`,
							},
						],
					},
				}),
			);
		});

		it("should use a custom model when provided", async () => {
			server.post(
				{
					url: "/v1/messages",
					body: { model: "claude-opus-4-5" },
				},
				{
					status: 200,
					body: MOCK_RESPONSE,
				},
			);

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
				prompt: MOCK_PROMPT,
				model: "claude-opus-4-5",
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, MOCK_RESPONSE.content[0].text);
		});

		it("should generate post using prompt from file when no prompt provided", async () => {
			server.post("/v1/messages", {
				status: 200,
				body: MOCK_RESPONSE,
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN);
			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, MOCK_RESPONSE.content[0].text);
		});

		it("should handle API errors", async () => {
			server.post("/v1/messages", {
				status: 500,
				body: { error: "Internal Server Error" },
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/500/,
			);
		});

		it("should handle missing completion response", async () => {
			server.post("/v1/messages", {
				status: 200,
				body: { content: [] },
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/No content received from Anthropic/,
			);
		});

		it("should remove leading and trailing quotation marks from the response", async () => {
			const responseWithQuotes = {
				...MOCK_RESPONSE,
				content: [
					{
						type: "text",
						text: '"Test message with quotes"',
					},
				],
			};

			server.post("/v1/messages", {
				status: 200,
				body: responseWithQuotes,
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
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
				...MOCK_RESPONSE,
				id: "msg_123",
				content: [{ type: "text", text: "x".repeat(281) }],
			};

			const goodResponse = {
				...MOCK_RESPONSE,
				id: "msg_456",
				content: [{ type: "text", text: "Short enough response" }],
			};

			server.post("/v1/messages", {
				status: 200,
				body: longResponse,
			});

			server.post("/v1/messages", {
				status: 200,
				body: goodResponse,
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
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
				...MOCK_RESPONSE,
				content: [
					{
						type: "text",
						text: `Test message with URL: https://example.com/very/long/url/that/would/normally/be/longer and another https://test.com/url`,
					},
				],
			};

			server.post("/v1/messages", {
				status: 200,
				body: response,
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			// This should pass because URLs count as 27 chars
			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, response.content[0].text);
		});

		it("should throw after MAX_RETRIES attempts", async () => {
			const longResponse = {
				...MOCK_RESPONSE,
				content: [{ type: "text", text: "x".repeat(281) }],
			};

			// Setup three different responses for three retries
			server.post("/v1/messages", {
				status: 200,
				body: longResponse,
			});

			server.post("/v1/messages", {
				status: 200,
				body: longResponse,
			});

			server.post("/v1/messages", {
				status: 200,
				body: longResponse,
			});

			const generator = new AnthropicPostGenerator(ANTHROPIC_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/Failed to generate post within 280 characters after 3 attempts/,
			);

			// Verify all three attempts were made
			server.assertAllRoutesCalled();
		});
	});
});

describe("readPrompt() (anthropic)", () => {
	it("should read the prompt from a file", async () => {
		const prompt = await readPrompt();
		assert.ok(prompt.length > 0);
	});
});
