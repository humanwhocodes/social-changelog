/**
 * @fileoverview Tests for GitHub release fetching and validation.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { validateRepo, fetchRelease } from "../src/github.js";
import { MockServer, FetchMocker } from "mentoss";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const server = new MockServer("https://api.github.com");
const fetchMocker = new FetchMocker({
	servers: [server],
});

const MOCK_LATEST_RELEASE = {
	html_url: "https://github.com/user/repo/releases/v1.0.0",
	tag_name: "v1.0.0",
	body: "Release notes for v1.0.0",
};

const MOCK_SPECIFIC_RELEASE = {
	html_url: "https://github.com/user/repo/releases/v2.0.0",
	tag_name: "v2.0.0",
	body: "Release notes for v2.0.0",
};

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("validateRepo()", () => {
	it("should accept valid repository names", () => {
		assert.doesNotThrow(() => {
			validateRepo("username/repo");
			validateRepo("org-name/repo-name");
			validateRepo("org.name/repo.name");
			validateRepo("org_name/repo_name");
		});
	});

	it("should throw on invalid repository names", () => {
		assert.throws(() => validateRepo(""), /Missing repository name/);
		assert.throws(() => validateRepo(" "), /Missing repository name/);
		assert.throws(() => validateRepo("invalid"), /Invalid repository name/);
		assert.throws(() => validateRepo("/repo"), /Invalid repository name/);
		assert.throws(() => validateRepo("user/"), /Invalid repository name/);
		assert.throws(
			() => validateRepo("user//repo"),
			/Invalid repository name/,
		);
	});

	it("should throw on non-string inputs", () => {
		assert.throws(() => validateRepo(null), /Missing repository name/);
		assert.throws(() => validateRepo(undefined), /Missing repository name/);
		assert.throws(() => validateRepo(123), /Missing repository name/);
	});
});

describe("fetchRelease()", () => {
	beforeEach(() => {
		fetchMocker.mockGlobal();
	});

	afterEach(() => {
		fetchMocker.unmockGlobal();
		server.clear();
	});

	it("should fetch latest release when no tag is specified", async () => {
		server.get("/repos/user/repo/releases/latest", {
			status: 200,
			body: MOCK_LATEST_RELEASE,
		});

		const release = await fetchRelease("user/repo");
		assert.deepStrictEqual(release, {
			url: MOCK_LATEST_RELEASE.html_url,
			tagName: MOCK_LATEST_RELEASE.tag_name,
			version: "1.0.0",
			details: MOCK_LATEST_RELEASE.body,
		});
	});

	it("should fetch specific release when tag is specified", async () => {
		server.get("/repos/user/repo/releases/tags/v2.0.0", {
			status: 200,
			body: MOCK_SPECIFIC_RELEASE,
		});

		const release = await fetchRelease("user/repo", "v2.0.0");
		assert.deepStrictEqual(release, {
			url: MOCK_SPECIFIC_RELEASE.html_url,
			tagName: MOCK_SPECIFIC_RELEASE.tag_name,
			version: "2.0.0",
			details: MOCK_SPECIFIC_RELEASE.body,
		});
	});

	it("should throw when release is not found", async () => {
		server.get("/repos/user/repo/releases/latest", {
			status: 404,
			body: { message: "Not Found" },
		});

		await assert.rejects(
			() => fetchRelease("user/repo"),
			/Error fetching release/,
		);
	});

	it("should throw when invalid tag name is provided", async () => {
		server.get("/repos/user/repo/releases/tags/invalid", {
			status: 200,
			body: {
				html_url: "https://github.com/user/repo/releases/tags/invalid",
				tag_name: "invalid",
				body: "Invalid release",
			},
		});

		await assert.rejects(
			() => fetchRelease("user/repo", "invalid"),
			/Invalid tag name: invalid/,
		);
	});
});
