/**
 * @fileoverview Tests for the CLI class.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import path from "node:path";
import fsp from "node:fs/promises";
import { CLI } from "../src/cli.js";
import { MockServer, FetchMocker } from "mentoss";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

class TestConsole {
	logs = [];
	errors = [];

	log(...args) {
		this.logs.push(args.join(" "));
	}

	error(...args) {
		this.errors.push(args.join(" "));
	}

	reset() {
		this.logs = [];
		this.errors = [];
	}
}

const githubServer = new MockServer("https://api.github.com");
const openAIServer = new MockServer("https://api.openai.com");
const anthropicServer = new MockServer("https://api.anthropic.com");
const fetchMocker = new FetchMocker({
	servers: [githubServer, openAIServer, anthropicServer],
});

const MOCK_RELEASE = {
	html_url: "https://github.com/test-org/test-repo/releases/v1.0.0",
	tag_name: "v1.0.0",
	body: "Test release notes",
};

const MOCK_RESPONSE = {
	id: "resp_123",
	output: [
		{
			content: [
				{
					type: "output_text",
					text: "Generated post",
				},
			],
		},
	],
};

const MOCK_ANTHROPIC_RESPONSE = {
	id: "msg_123",
	content: [
		{
			type: "text",
			text: "Generated post",
		},
	],
};

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("CLI", () => {
	let testConsole;
	let cli;

	beforeEach(() => {
		testConsole = new TestConsole();
		cli = new CLI({
			console: testConsole,
			env: { OPENAI_API_KEY: "test-token" },
		});
		fetchMocker.mockGlobal();
	});

	afterEach(() => {
		fetchMocker.unmockGlobal();
		githubServer.clear();
		openAIServer.clear();
		anthropicServer.clear();
	});

	describe("constructor", () => {
		it("should create CLI instance with default options", () => {
			const cli = new CLI();
			assert.ok(cli instanceof CLI);
		});

		it("should create CLI instance with custom options", () => {
			const env = { OPENAI_API_KEY: "test" };
			const cli = new CLI({ env, console: testConsole });
			assert.ok(cli instanceof CLI);
		});
	});

	describe("parseArgs()", () => {
		it("should parse org argument correctly", () => {
			const result = cli.parseArgs(["--org", "test-org"]);
			assert.equal(result.org, "test-org");
		});

		it("should parse repo argument correctly", () => {
			const result = cli.parseArgs(["--repo", "test-repo"]);
			assert.equal(result.repo, "test-repo");
		});

		it("should parse name argument correctly", () => {
			const result = cli.parseArgs(["--name", "test-name"]);
			assert.equal(result.name, "test-name");
		});

		it("should parse tag argument correctly", () => {
			const result = cli.parseArgs(["--tag", "v1.0.0"]);
			assert.equal(result.tag, "v1.0.0");
		});

		it("should parse help flag correctly", () => {
			const result = cli.parseArgs(["--help"]);
			assert.equal(result.help, true);
		});

		it("should parse short options correctly", () => {
			const result = cli.parseArgs([
				"-o",
				"test-org",
				"-r",
				"test-repo",
				"-n",
				"test-name",
			]);
			assert.equal(result.org, "test-org");
			assert.equal(result.repo, "test-repo");
			assert.equal(result.name, "test-name");
		});
	});

	describe("execute()", () => {
		it("should show help when --help is specified", async () => {
			const exitCode = await cli.execute(["--help"]);
			assert.equal(exitCode, 0);
			assert.ok(testConsole.logs.length > 0);
			assert.ok(testConsole.logs[0].includes("Usage:"));
		});

		it("should return error when required args are missing", async () => {
			const exitCode = await cli.execute([]);
			assert.equal(exitCode, 1);
			assert.ok(testConsole.errors.length > 0);
			assert.ok(
				testConsole.errors[0].includes("Missing required arguments"),
			);
		});

		it("should generate social post with just org and repo", async () => {
			// Setup mock responses
			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 200,
				body: MOCK_RELEASE,
			});

			openAIServer.post("/v1/responses", {
				status: 200,
				body: MOCK_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: "Bearer test-token",
				},
			});

			const exitCode = await cli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
			]);

			assert.equal(exitCode, 0);
			assert.equal(testConsole.logs[0], "Generated post");
		});

		it("should generate social post when all args are valid", async () => {
			// Setup mock responses
			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 200,
				body: MOCK_RELEASE,
			});

			openAIServer.post("/v1/responses", {
				status: 200,
				body: MOCK_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: "Bearer test-token",
				},
			});

			const exitCode = await cli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
				"--name",
				"test-name",
			]);

			assert.equal(exitCode, 0);
			assert.equal(testConsole.logs[0], "Generated post");
		});

		it("should handle GitHub API errors", async () => {
			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 404,
				body: { message: "Not Found" },
			});

			const exitCode = await cli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
				"--name",
				"test-name",
			]);

			assert.equal(exitCode, 1);
			assert.ok(testConsole.errors[0].includes("Error fetching release"));
		});

		it("should handle OpenAI API errors", async () => {
			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 200,
				body: MOCK_RELEASE,
			});

			openAIServer.post("/v1/responses", {
				status: 500,
				body: { error: "Internal Server Error" },
			});

			const exitCode = await cli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
				"--name",
				"test-name",
			]);

			assert.equal(exitCode, 1);
			assert.ok(
				testConsole.errors[0].includes("Response generation failed"),
			);
		});

		it("should error when only GITHUB_TOKEN is provided", async () => {
			// Create CLI with only GITHUB_TOKEN, no OPENAI_API_KEY
			const githubTokenCli = new CLI({
				console: testConsole,
				env: { GITHUB_TOKEN: "github-token" },
			});

			const exitCode = await githubTokenCli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
			]);

			assert.equal(exitCode, 1);
			assert.ok(
				testConsole.errors[0].includes(
					"The GitHub Models API has been retired",
				),
			);

			// Verify no network calls were made
			assert.equal(
				githubServer.called(
					"/repos/test-org/test-repo/releases/latest",
				),
				false,
			);
			assert.equal(openAIServer.called("/v1/responses"), false);
		});

		it("should generate social post using ANTHROPIC_API_KEY when OPENAI_API_KEY is not set", async () => {
			const anthropicCli = new CLI({
				console: testConsole,
				env: { ANTHROPIC_API_KEY: "test-anthropic-token" },
			});

			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 200,
				body: MOCK_RELEASE,
			});

			anthropicServer.post("/v1/messages", {
				status: 200,
				body: MOCK_ANTHROPIC_RESPONSE,
				headers: {
					"content-type": "application/json",
					"x-api-key": "test-anthropic-token",
				},
			});

			const exitCode = await anthropicCli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
			]);

			assert.equal(exitCode, 0);
			assert.equal(testConsole.logs[0], "Generated post");
		});

		it("should use OPENAI_API_KEY when both OPENAI_API_KEY and ANTHROPIC_API_KEY are set", async () => {
			const bothKeysCli = new CLI({
				console: testConsole,
				env: {
					OPENAI_API_KEY: "test-token",
					ANTHROPIC_API_KEY: "test-anthropic-token",
				},
			});

			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 200,
				body: MOCK_RELEASE,
			});

			openAIServer.post("/v1/responses", {
				status: 200,
				body: MOCK_RESPONSE,
				headers: {
					"content-type": "application/json",
					authorization: "******",
				},
			});

			const exitCode = await bothKeysCli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
			]);

			assert.equal(exitCode, 0);
			assert.equal(testConsole.logs[0], "Generated post");
			assert.equal(anthropicServer.called("/v1/messages"), false);
		});

		it("should error when no API key is provided", async () => {
			const noKeyCli = new CLI({
				console: testConsole,
				env: {},
			});

			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 200,
				body: MOCK_RELEASE,
			});

			const exitCode = await noKeyCli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
			]);

			assert.equal(exitCode, 1);
			assert.ok(
				testConsole.errors[0].includes("Missing Anthropic API token"),
			);
		});

		it("should use custom prompt from --prompt-file option", async () => {
			const promptPath = path.resolve(
				"tests",
				"fixtures",
				"prompt-custom.txt",
			);
			const customPrompt = await fsp.readFile(promptPath, "utf8");

			githubServer.get("/repos/test-org/test-repo/releases/latest", {
				status: 200,
				body: MOCK_RELEASE,
			});

			openAIServer.post(
				{
					url: "/v1/responses",
					body: {
						instructions: customPrompt,
					},
				},
				{
					status: 200,
					body: {
						id: "resp_456",
						output: [
							{
								content: [
									{
										type: "output_text",
										text: "CUSTOMPROMPT",
									},
								],
							},
						],
					},
				},
			);

			const exitCode = await cli.execute([
				"--org",
				"test-org",
				"--repo",
				"test-repo",
				"--prompt-file",
				promptPath,
			]);

			assert.equal(exitCode, 0);
			assert.equal(testConsole.logs[0], "CUSTOMPROMPT");
		});
	});

	describe("showHelp()", () => {
		it("should display help message with all options", () => {
			cli.showHelp();
			assert.ok(testConsole.logs.length > 0);
			assert.ok(testConsole.logs.some(log => log.includes("--org")));
			assert.ok(testConsole.logs.some(log => log.includes("--repo")));
			assert.ok(testConsole.logs.some(log => log.includes("--name")));
			assert.ok(testConsole.logs.some(log => log.includes("--tag")));
			assert.ok(testConsole.logs.some(log => log.includes("--help")));
		});
	});
});
