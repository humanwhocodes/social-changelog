import js from "@eslint/js";

export default [
	{
		ignores: ["tests/fixtures"],
	},
	js.configs.recommended,
	{
		languageOptions: {
			globals: {
				process: false,
				URL: false,
				console: false,
			},
		},
		rules: {
			"no-console": "error"
		}
	},
	{
		files: ["tests/**/*.js"],
		languageOptions: {
			globals: {
				describe: false,
				it: false,
				beforeEach: false,
				afterEach: false,
			},
		},
	},
];
