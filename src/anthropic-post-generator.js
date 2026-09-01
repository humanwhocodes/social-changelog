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
/** @typedef {import("./types.js").AnthropicResponse} AnthropicResponse */

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------

const MAX_CHARACTERS = 280;
const MAX_RETRIES = 3;
const URL_LENGTH = 27; // Bluesky counts URLs as 27 characters
const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

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

/**
 * Measures the length of a social media post in characters using Bluesky rules.
 * @param {string} text The text to measure.
 * @returns {number} The length in characters.
 */
function getPostLength(text) {
	// URLs count as exactly 27 characters on Bluesky
	const urlRegex = /https?:\/\/[^\s]+/g;
	return text.replace(urlRegex, "x".repeat(URL_LENGTH)).length;
}

/**
 * Removes leading and trailing quotation marks from a string.
 * @param {string} text The text to clean.
 * @returns {string} The text without leading/trailing quotes.
 */
function removeQuotes(text) {
	return text.replace(/^["']|["']$/g, "").trim();
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * Generates a social media post using Anthropic's Claude models.
 */
export class AnthropicPostGenerator {
	/**
	 * The Anthropic API token.
	 * @type {string}
	 */
	#token;

	/**
	 * The AI prompt.
	 * @type {string}
	 */
	#prompt;

	/**
	 * The model to use.
	 * @type {string}
	 */
	#model;

	/**
	 * Creates a new AnthropicPostGenerator instance.
	 * @param {string|undefined} token The Anthropic API token.
	 * @param {Object} [options] The options for the generator.
	 * @param {string} [options.prompt] The AI prompt.
	 * @param {string} [options.model] The model to use.
	 * @throws {Error} If the token is missing.
	 */
	constructor(token, { prompt = "", model = DEFAULT_MODEL } = {}) {
		if (!token) {
			throw new Error("Missing Anthropic API token");
		}

		if (typeof token !== "string") {
			throw new Error("Anthropic API token isn't a string");
		}

		this.#token = token;
		this.#prompt = prompt;
		this.#model = model;
	}

	/**
	 * Fetches a completion from Anthropic.
	 * @param {Object} options The options for the completion.
	 * @param {string} options.system The system instructions.
	 * @param {string} options.input The user input.
	 * @returns {Promise<AnthropicResponse>} The response data.
	 * @throws {Error} If the response is not ok.
	 */
	async #fetchCompletion({ system, input }) {
		const response = await fetch(API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.#token,
				"anthropic-version": ANTHROPIC_VERSION,
			},
			body: JSON.stringify({
				model: this.#model,
				max_tokens: MAX_TOKENS,
				system,
				messages: [
					{
						role: "user",
						content: input,
					},
				],
			}),
		});

		if (!response.ok) {
			throw new Error(
				`${response.status} ${response.statusText}: Response generation failed`,
			);
		}

		return await response.json();
	}

	/**
	 * Extracts the generated text from a response.
	 * @param {AnthropicResponse} responseData The response data from the API.
	 * @returns {string} The generated text.
	 * @throws {Error} If no content is found.
	 */
	#extractGeneratedText(responseData) {
		const message = responseData.content?.[0]?.text;
		if (!message) {
			throw new Error("No content received from Anthropic");
		}
		return message;
	}

	/**
	 * Generates a tweet summary using Anthropic with retry logic for length.
	 * @param {string} projectName The name of the project.
	 * @param {ReleaseInfo} release The release information.
	 * @returns {Promise<string>} The generated tweet
	 * @throws {Error} If unable to generate a valid post within retries
	 */
	async generateSocialPost(projectName, release) {
		const systemPrompt = this.#prompt || (await readPrompt());
		const { details, url, version } = release;
		const baseInput = `Create a post summarizing this release for ${projectName} ${version}: ${details}\n\nURL is ${url}`;

		let attempts = 0;
		let input = baseInput;

		while (attempts < MAX_RETRIES) {
			const responseData = await this.#fetchCompletion({
				system: systemPrompt,
				input,
			});

			const post = this.#extractGeneratedText(responseData);
			const cleanPost = removeQuotes(post);

			if (getPostLength(cleanPost) <= MAX_CHARACTERS) {
				return cleanPost;
			}

			input = `${baseInput}\n\nThe previous response was too long. Make it shorter.`;
			attempts++;
		}

		throw new Error(
			`Failed to generate post within ${MAX_CHARACTERS} characters after ${MAX_RETRIES} attempts`,
		);
	}
}
