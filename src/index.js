/**
 * @fileoverview The main entry point for the library.
 * @author Nicholas C. Zakas
 */

// @ts-self-types="./index.d.ts"

export {
	/** @deprecated Use ResponseAPIPostGenerator instead */
	ResponseAPIPostGenerator as PostGenerator,
	ResponseAPIPostGenerator,
} from "./response-api-post-generator.js";
export { validateRepo, fetchRelease } from "./github.js";
export { CLI } from "./cli.js";
