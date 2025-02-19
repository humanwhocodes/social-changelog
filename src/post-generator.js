/**
 * @fileoverview Script to make a social post about the latest release.
 * @author Nicholas C. Zakas
 */

/* global fetch */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import fsp from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").ReleaseInfo} ReleaseInfo */
/** @typedef {import("./types.js").GptMessage} GptMessage */
/** @typedef {import("./types.js").GptChatCompletionResponse} GptChatCompletionResponse */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Reads the AI prompt from disk.
 * @returns {Promise<string>} The prompt text.
 * @throws {Error} If the file cannot be read.
 */
export async function readPrompt() {
	const currentDir = dirname(fileURLToPath(import.meta.url));
	return fsp.readFile(join(currentDir, "prompt.txt"), "utf8");
}

const gptRoles = new Set(["user", "system", "developer"]);

/**
 * Validates the role of a GPT message.
 * @param {string} role The role to validate.
 * @returns {void}
 * @throws {Error} If the role is invalid.
 */
function validateGptRole(role) {
	if (typeof role !== "string" || role.trim() === "") {
		throw new Error("Invalid role");
	}

	if (!gptRoles.has(role)) {
		throw new Error(`Invalid role: ${role}`);
	}
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Generates a social media post using OpenAI.
 */
export class PostGenerator {
	/**
	 * The OpenAI API token.
	 * @type {string}
	 */
	#token;

	/**
	 * The AI prompt.
	 * @type {string}
	 */
	#prompt;

	/**
	 * Creates a new PostGenerator instance.
	 * @param {string|undefined} token The OpenAI API token.
	 * @param {Object} [options] The options for the generator.
	 * @param {string} [options.prompt] The AI prompt.
	 * @throws {Error} If the token is missing.
	 */
	constructor(token, { prompt = "" } = {}) {
		if (!token) {
			throw new Error("Missing OpenAI API token");
		}

		if (typeof token !== "string") {
			throw new Error("OpenAI API token isn't a string");
		}

		this.#token = token;
		this.#prompt = prompt;
	}

	/**
	 * Fetches a completion from OpenAI.
	 * @param {Object} options The options for the completion.
	 * @param {string} options.model The model to use.
	 * @param {Array<GptMessage>} options.messages The messages to send.
	 * @returns {Promise<GptChatCompletionResponse>} The completion response.
	 * @throws {Error} If the response is not ok.
	 */
	async #fetchCompletion({ model, messages }) {
		messages.forEach(message => {
			validateGptRole(message.role);
		});

		const response = await fetch(
			"https://api.openai.com/v1/chat/completions",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.#token}`,
				},
				body: JSON.stringify({
					model,
					messages,
					temperature: 0.7,
				}),
			},
		);

		if (!response.ok) {
			throw new Error(
				`${response.status} ${response.statusText}: Chat completion failed`,
			);
		}

		return await response.json();
	}

	/**
	 * Generates a tweet summary using OpenAI.
	 * @param {string} projectName The name of the project.
	 * @param {ReleaseInfo} release The release information.
	 * @returns {Promise<string>} The generated tweet
	 */
	async generateSocialPost(projectName, release) {
		const systemPrompt = this.#prompt || (await readPrompt());

		const { details, url, version } = release;

		const completion = await this.#fetchCompletion({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: systemPrompt },
				{
					role: "user",
					content: `Create a post summarizing this release for ${projectName} ${version}: ${details}\n\nURL is ${url}`,
				},
			],
		});

		return completion.choices[0]?.message?.content;
	}
}
