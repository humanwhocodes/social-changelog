/**
 * @fileoverview Tests for the PostGenerator class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import {
	ResponseAPIPostGenerator,
	readPrompt,
} from "../src/response-api-post-generator.js";
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

const MOCK_RESPONSE = {
	id: "resp_123",
	output: [
		{
			content: [
				{
					type: "output_text",
					text: "🎉 Exciting release! Project v1.0.0 is out with awesome new features. Check it out! #opensource",
				},
			],
		},
	],
};

const server = new MockServer("https://api.openai.com");
const fetchMocker = new FetchMocker({
	servers: [server],
});

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("ResponseAPIPostGenerator", () => {
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
				() => new ResponseAPIPostGenerator(),
				/Missing OpenAI API token/,
			);
		});

		it("should throw an error when token isn't a string", () => {
			assert.throws(
				() => new ResponseAPIPostGenerator(123),
				/OpenAI API token isn't a string/,
			);
		});

		it("should create instance with token and prompt", () => {
			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});
			assert.ok(generator instanceof ResponseAPIPostGenerator);
		});
	});

	describe("generateSocialPost()", () => {
		it("should generate post using provided prompt", async () => {
			server.post("/v1/responses", {
				status: 200,
				body: MOCK_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, MOCK_RESPONSE.output[0].content[0].text);
		});

		it("should use correct input and previous_response_id when retrying", async () => {
			const longResponse = {
				id: "resp_123",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: "x".repeat(281),
							},
						],
					},
				],
			};

			const goodResponse = {
				id: "resp_456",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: "Short enough response",
							},
						],
					},
				],
			};

			server.post("/v1/responses", {
				status: 200,
				body: longResponse,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			server.post("/v1/responses", {
				status: 200,
				body: goodResponse,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, "Short enough response");
		});

		it("should generate post using prompt from file when no prompt provided", async () => {
			server.post("/v1/responses", {
				status: 200,
				body: MOCK_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN);
			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, MOCK_RESPONSE.output[0].content[0].text);
		});

		it("should handle API errors", async () => {
			server.post("/v1/responses", {
				status: 500,
				body: { error: "Internal Server Error" },
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/500/,
			);
		});

		it("should handle missing completion response", async () => {
			server.post("/v1/responses", {
				status: 200,
				body: { output: [] },
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			await assert.rejects(
				() => generator.generateSocialPost("testproject", MOCK_RELEASE),
				/No content received from OpenAI/,
			);
		});

		it("should remove leading and trailing quotation marks from the response", async () => {
			const responseWithQuotes = {
				id: "resp_123",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: '"Test message with quotes"',
							},
						],
					},
				],
			};

			server.post("/v1/responses", {
				status: 200,
				body: responseWithQuotes,
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${OPENAI_TOKEN}`,
				},
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
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
				id: "resp_123",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: "x".repeat(281),
							},
						],
					},
				],
			};

			const goodResponse = {
				id: "resp_456",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: "Short enough response",
							},
						],
					},
				],
			};

			server.post("/v1/responses", {
				status: 200,
				body: longResponse,
			});

			server.post("/v1/responses", {
				status: 200,
				body: goodResponse,
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
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
				id: "resp_123",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: `Test message with URL: https://example.com/very/long/url/that/would/normally/be/longer and another https://test.com/url`,
							},
						],
					},
				],
			};

			server.post("/v1/responses", {
				status: 200,
				body: response,
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
				prompt: MOCK_PROMPT,
			});

			// This should pass because URLs count as 27 chars
			const post = await generator.generateSocialPost(
				"testproject",
				MOCK_RELEASE,
			);
			assert.strictEqual(post, response.output[0].content[0].text);
		});

		it("should throw after MAX_RETRIES attempts", async () => {
			const longResponse = {
				id: "resp_123",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: "x".repeat(281),
							},
						],
					},
				],
			};

			// Setup three different responses for three retries
			server.post("/v1/responses", {
				status: 200,
				body: longResponse,
				headers: {
					"content-type": "application/json",
				},
			});

			server.post("/v1/responses", {
				status: 200,
				body: longResponse,
				headers: {
					"content-type": "application/json",
				},
			});

			server.post("/v1/responses", {
				status: 200,
				body: longResponse,
				headers: {
					"content-type": "application/json",
				},
			});

			const generator = new ResponseAPIPostGenerator(OPENAI_TOKEN, {
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

describe("readPrompt()", () => {
	it("should read the prompt from a file", async () => {
		const prompt = await readPrompt();
		assert.ok(prompt.length > 0);
	});
});
