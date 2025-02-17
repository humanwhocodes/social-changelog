/**
 * @fileoverview Script to make a social post about the latest release.
 * @author Nicholas C. Zakas
 */

/* globals fetch */

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").GitHubRelease} GitHubRelease */
/** @typedef {import("./types.js").ReleaseInfo} ReleaseInfo */

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const GITHUB_API = "https://api.github.com/repos";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Extracts the version from a tag name.
 * @param {string} tagName The tag name to extract the version from.
 * @returns {string} The extracted version.
 * @throws {Error} If the tag name is invalid.
 */
function extractVersionFromTagName(tagName) {
	const match = tagName.match(/v?(\d+\.\d+\.\d+)/);
	if (!match) {
		throw new Error(
			`Invalid tag name: ${tagName}. Tag name must contain a semver-formatted version number.`,
		);
	}
	return match[1];
}

/**
 * Validates the repository name.
 * @param {string} repo The repository name to validate.
 * @throws {Error} If the repository name is invalid.
 */
export function validateRepo(repo) {
	if (typeof repo !== "string" || repo.trim() === "") {
		throw new Error("Missing repository name");
	}

	if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) {
		throw new Error(`Invalid repository name: ${repo}`);
	}
}

/**
 * Fetches a release from GitHub.
 * @param {string} repo The repository to fetch the release from.
 * @param {string} [tagName] The tag name of the release to fetch.
 * @returns {Promise<ReleaseInfo>} The release data.
 * @throws {Error} If the response is not ok.
 */
export async function fetchRelease(repo, tagName) {
	const url = `${GITHUB_API}/${repo}/releases/${tagName ? `tags/${tagName}` : "latest"}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(
			`Error fetching release from ${url}: ${response.status} ${response.statusText}`,
		);
	}

	const release = /** @type {GitHubRelease} */ (await response.json());

	return {
		url: release.html_url,
		tagName: release.tag_name,
		version: extractVersionFromTagName(release.tag_name),
		details: release.body,
	};
}
