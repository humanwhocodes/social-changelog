/**
 * @fileoverview Tests for API failure reporting.
 */

import assert from "node:assert/strict";
import { fetchRelease } from "../src/github.js";
import { ResponseAPIPostGenerator } from "../src/response-api-post-generator.js";
import { ChatCompletionPostGenerator } from "../src/chat-completion-post-generator.js";
import { AnthropicPostGenerator } from "../src/anthropic-post-generator.js";
import { CLI } from "../src/cli.js";

/* global Response */

const release = {
	url: "https://example.com/release",
	version: "1.0.0",
	details: "Release notes",
};

describe("API failure reporting", () => {
	let originalFetch;
	let originalConsole;
	let errors;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		originalConsole = globalThis.console;
		errors = [];
		globalThis.console = {
			...originalConsole,
			error: message => errors.push(message),
		};
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		globalThis.console = originalConsole;
	});

	const cases = [
		{
			name: "GitHub",
			url: "https://api.github.com/repos/user/repo/releases/latest",
			run: () => fetchRelease("user/repo"),
		},
		{
			name: "OpenAI Responses",
			url: "https://api.openai.com/v1/responses",
			run: () =>
				new ResponseAPIPostGenerator("token", {
					prompt: "prompt",
				}).generateSocialPost("project", release),
		},
		{
			name: "custom chat completions",
			url: "https://example.com/v1/chat/completions",
			run: () =>
				new ChatCompletionPostGenerator("token", {
					prompt: "prompt",
					baseUrl: "https://example.com/v1",
					model: "model",
				}).generateSocialPost("project", release),
		},
		{
			name: "Anthropic",
			url: "https://api.anthropic.com/v1/messages",
			run: () =>
				new AnthropicPostGenerator("token", {
					prompt: "prompt",
				}).generateSocialPost("project", release),
		},
	];

	for (const { name, url, run } of cases) {
		it(`reports the URL, status and response body for ${name}`, async () => {
			globalThis.fetch = async () =>
				new Response('{"error":"quota exceeded"}', {
					status: 429,
					statusText: "Too Many Requests",
				});

			await assert.rejects(run, /429/);
			assert.equal(errors.length, 1);
			assert.ok(errors[0].includes(url));
			assert.ok(errors[0].includes("429 Too Many Requests"));
			assert.ok(errors[0].includes('{"error":"quota exceeded"}'));
		});
	}

	it("reports network failures without inventing a response", async () => {
		const cause = new Error("connection refused");
		globalThis.fetch = async () => {
			throw cause;
		};

		await assert.rejects(() => fetchRelease("user/repo"), { cause });
		assert.equal(errors.length, 1);
		assert.match(
			errors[0],
			/https:\/\/api\.github\.com\/repos\/user\/repo\/releases\/latest/,
		);
		assert.match(errors[0], /connection refused/);
	});

	it("reports a CLI API failure only once", async () => {
		globalThis.fetch = async () =>
			new Response("upstream unavailable", { status: 503 });
		const cli = new CLI({ env: { OPENAI_API_KEY: "token" } });

		assert.equal(await cli.execute(["--org", "user", "--repo", "repo"]), 1);
		assert.equal(errors.length, 1);
		assert.match(errors[0], /503/);
		assert.match(errors[0], /upstream unavailable/);
	});

	it("reports the status when the response body cannot be read", async () => {
		globalThis.fetch = async () => {
			const response = new Response(null, { status: 503 });
			response.text = async () => {
				throw new Error("stream interrupted");
			};
			return response;
		};

		await assert.rejects(() => fetchRelease("user/repo"), /503/);
		assert.equal(errors.length, 1);
		assert.match(
			errors[0],
			/Unable to read response body: stream interrupted/,
		);
	});
});
