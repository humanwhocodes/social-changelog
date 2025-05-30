/**
 * @fileoverview The CLI class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { parseArgs } from "node:util";
import { ResponseAPIPostGenerator } from "./response-api-post-generator.js";
import { ChatCompletionPostGenerator } from "./chat-completion-post-generator.js";
import { fetchRelease } from "./github.js";

//-----------------------------------------------------------------------------
// Type Definitions
//-----------------------------------------------------------------------------

/** @typedef {import("./types.js").CLIArgs} CLIArgs */

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const GITHUB_BASE_URL = "https://models.github.ai/inference/";
const GITHUB_MODEL = "openai/gpt-4.1-mini";

//-----------------------------------------------------------------------------
// Argument Parsing
//-----------------------------------------------------------------------------

/**
 * The CLI handler.
 */
export class CLI {
	/**
	 * Environment variables.
	 * @type {Record<string,string>|typeof process.env}
	 */
	#env;

	/**
	 * Console object.
	 * @type {Console}
	 */
	#console;

	/**
	 * Creates a new CLI instance.
	 * @param {object} options The options for the CLI.
	 * @param {Record<string,string>} [options.env] The environment variables.
	 * @param {Console} [options.console] The console object.
	 */
	constructor({ env, console } = {}) {
		this.#env = env ?? process.env;
		this.#console = console ?? globalThis.console;
	}

	/**
	 * Runs the CLI.
	 * @param {string[]} args The command line arguments.
	 * @returns {Promise<number>} The exit code.
	 */
	async execute(args) {
		const flags = this.parseArgs(args);

		if (flags.help) {
			this.showHelp();
			return 0;
		}

		if (!flags.org || !flags.repo) {
			this.#console.error("Missing required arguments: --org, --repo");
			this.showHelp();
			return 1;
		}

		const { org, repo } = flags;
		const githubToken = this.#env.GITHUB_TOKEN;
		const token = this.#env.OPENAI_API_KEY;
		const name = flags.name || `${org}/${repo}`;

		let prompt = "";
		if (flags.promptFile) {
			try {
				const fsp = await import("node:fs/promises");
				prompt = await fsp.readFile(flags.promptFile, "utf8");
			} catch (err) {
				const message =
					err instanceof Error ? err.message : String(err);
				this.#console.error(`Error reading prompt file: ${message}`);
				return 1;
			}
		}

		try {
			const release = await fetchRelease(`${org}/${repo}`, flags.tag);
			const generator = githubToken
				? new ChatCompletionPostGenerator(githubToken, {
						baseUrl: GITHUB_BASE_URL,
						model: GITHUB_MODEL,
						prompt,
					})
				: new ResponseAPIPostGenerator(token, { prompt });
			const post = await generator.generateSocialPost(name, release);

			this.#console.log(post);
		} catch (error) {
			this.#console.error(
				`Error: ${/** @type {Error} */ (error).message}`,
			);
			return 1;
		}
		return 0;
	}

	/**
	 * Parses the command line arguments.
	 * @param {string[]} args The command line arguments.
	 * @returns {CLIArgs} The parsed arguments.
	 */
	parseArgs(args) {
		const { values: flags } = parseArgs({
			args,
			options: {
				org: { type: "string", short: "o" },
				repo: { type: "string", short: "r" },
				name: { type: "string", short: "n" },
				tag: { type: "string", short: "t" },
				help: { type: "boolean", short: "h" },
				"prompt-file": { type: "string" },
			},
			allowPositionals: false,
			strict: false,
		});

		// Map kebab-case to camelCase for CLIArgs
		if ("prompt-file" in flags) {
			flags.promptFile = flags["prompt-file"];
			delete flags["prompt-file"];
		}

		return /** @type {CLIArgs} */ (flags);
	}

	/**
	 * Shows the help message.
	 * @returns {void}
	 */
	showHelp() {
		this.#console.log(
			"Usage: node cli.js --org <org> --repo <repo> --name <name>",
		);
		this.#console.log("Options:");
		this.#console.log("  --org,  -o  The organization name");
		this.#console.log("  --repo, -r The repository name");
		this.#console.log("  --name, -n The name of the project");
		this.#console.log("  --tag,  -t The release tag [default: latest]");
		this.#console.log("  --prompt-file  Path to a custom prompt file");
		this.#console.log("  --help, -h Show this help message");
		this.#console.log("");
	}
}
