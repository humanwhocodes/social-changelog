/**
 * @fileoverview Shared API request handling.
 */

import { logApiError } from "./cli.js";

/* global fetch */

export class ApiError extends Error {}

/**
 * Makes an API request and reports failures.
 * @param {string|URL} url The request URL.
 * @param {RequestInit} [options] The fetch options.
 * @param {string} [description] The failure description.
 * @returns {Promise<Response>} The successful response.
 */
export async function fetchApi(
	url,
	options,
	description = "API request failed",
) {
	let response;
	try {
		response = await fetch(url, options);
	} catch (cause) {
		const detail = cause instanceof Error ? cause.message : String(cause);
		const message = `${description}: ${url}: ${detail}`;
		logApiError(message);
		throw new ApiError(message, { cause });
	}

	if (!response.ok) {
		let body;
		try {
			body = await response.text();
		} catch (error) {
			const detail =
				error instanceof Error ? error.message : String(error);
			body = `[Unable to read response body: ${detail}]`;
		}
		const message = `${description}: ${response.url || url}: ${response.status} ${response.statusText}\n${body}`;
		logApiError(message);
		throw new ApiError(message);
	}

	return response;
}
