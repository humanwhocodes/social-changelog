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
/** @typedef {import("./types.js").OpenAIResponse} OpenAIResponse */

//-----------------------------------------------------------------------------
// Constants
//-----------------------------------------------------------------------------

const MAX_CHARACTERS = 280;
const MAX_RETRIES = 3;
const URL_LENGTH = 27; // Bluesky counts URLs as 27 characters

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
 * Generates a social media post using OpenAI.
 */
export class ResponseAPIPostGenerator {
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
	 * @param {string | null} [options.instructions] The system instructions.
	 * @param {string} options.input The user input.
	 * @param {string | null} [options.previousResponseId] The previous response ID for retries.
	 * @returns {Promise<OpenAIResponse>} The response data.
	 * @throws {Error} If the response is not ok.
	 */
	async #fetchCompletion({
		model,
		instructions = null,
		input,
		previousResponseId = null,
	}) {
		const response = await fetch("https://api.openai.com/v1/responses", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.#token}`,
			},
			body: JSON.stringify({
				model,
				instructions,
				input,
				previous_response_id: previousResponseId,
				temperature: 0.7,
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
	 * @param {OpenAIResponse} responseData The response data from the API.
	 * @returns {string} The generated text.
	 * @throws {Error} If no content is found.
	 */
	#extractGeneratedText(responseData) {
		const message = responseData.output?.[0]?.content?.[0]?.text;
		if (!message) {
			throw new Error("No content received from OpenAI");
		}
		return message;
	}

	/**
	 * Generates a tweet summary using OpenAI with retry logic for length.
	 * @param {string} projectName The name of the project.
	 * @param {ReleaseInfo} release The release information.
	 * @returns {Promise<string>} The generated tweet
	 * @throws {Error} If unable to generate a valid post within retries
	 */
	async generateSocialPost(projectName, release) {
		const systemPrompt = this.#prompt || (await readPrompt());
		const { details, url, version } = release;
		const input = `Create a post summarizing this release for ${projectName} ${version}: ${details}\n\nURL is ${url}`;

		let attempts = 0;
		let previousResponseId = null;

		while (attempts < MAX_RETRIES) {
			const responseData = await this.#fetchCompletion({
				model: "gpt-4o-mini",
				instructions: attempts === 0 ? systemPrompt : null,
				input:
					attempts === 0
						? input
						: "The previous response was too long. Make it shorter.",
				previousResponseId,
			});

			const post = this.#extractGeneratedText(responseData);
			const cleanPost = removeQuotes(post);

			if (getPostLength(cleanPost) <= MAX_CHARACTERS) {
				return cleanPost;
			}

			previousResponseId = responseData.id;
			attempts++;
		}

		throw new Error(
			`Failed to generate post within ${MAX_CHARACTERS} characters after ${MAX_RETRIES} attempts`,
		);
	}
}
