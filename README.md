# Social Changelog

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate) or [nominate me](https://stars.github.com/nominate/) for a GitHub Star.

## Description

A tool that generates social media posts from GitHub releases using AI. Given a GitHub repository and release, it creates an engaging social post summarizing the key changes and improvements. This is useful for automatically creating announcement posts for new releases.

This tool uses [OpenAI](https://platform.openai.com) `gpt-4o-mini` and an OpenAI API token is required.

## Installation

```bash
npm install @humanwhocodes/social-changelog
```

## CLI Usage

The command line interface requires an OpenAI API key to be set in the environment:

```bash
export OPENAI_API_KEY=your-api-key
```

Then you can generate posts using:

```bash
npx social-changelog --org <org> --repo <repo> --name <project-name>
```

### Options

- `--org, -o` - The GitHub organization or username
- `--repo, -r` - The repository name
- `--name, -n` - (Optional) The display name of the project (defaults to org/repo)
- `--tag, -t` - (Optional) Specific release tag to use (defaults to latest)
- `--help, -h` - Show help information

### Examples

Generate post for latest release:

```bash
npx social-changelog --org humanwhocodes --repo social-changelog
```

By default, the `org/repo` will be used as the project name. You can override this by providing the `--name` option:

```bash
npx social-changelog --org humanwhocodes --repo social-changelog --name "Social Changelog"
```

The latest release will be used by default. You can ovveride this by providing the `--tag` option:

```bash
npx social-changelog --org humanwhocodes --repo social-changelog --name "Social Changelog" --tag v1.0.0
```

**Note:** The tag name must contain a semver-formatted version number.

The CLI outputs the post onto the console so you can capture it or pipe it into another tool.

## API Usage

### `PostGenerator`

The main class for generating social posts.

```javascript
import { PostGenerator } from "@humanwhocodes/social-changelog";

// Create generator instance
const generator = new PostGenerator(process.env.OPENAI_API_KEY, {
	prompt: "Optional custom prompt",
});

// Generate a post
const post = await generator.generateSocialPost("Project Name", {
	url: "https://github.com/org/repo/releases/v1.0.0",
	tagName: "v1.0.0",
	version: "1.0.0",
	details: "Release notes content",
});
```

### `fetchRelease`

Helper function to fetch release information from GitHub.

```javascript
import { fetchRelease } from "@humanwhocodes/social-changelog";

// Fetch latest release
const release = await fetchRelease("org/repo");

// Fetch specific release
const release = await fetchRelease("org/repo", "v1.0.0");
```

The release object contains:

- `url` - Release page URL
- `tagName` - Git tag name
- `version` - Semantic version
- `details` - Release notes content

## License

Apache 2.0
