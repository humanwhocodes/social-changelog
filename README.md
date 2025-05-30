# Social Changelog

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate) or [nominate me](https://stars.github.com/nominate/) for a GitHub Star.

## Description

A tool that generates social media posts from GitHub releases using AI. Given a GitHub repository and release, it creates an engaging social post summarizing the key changes and improvements. This is useful for automatically creating announcement posts for new releases.

This tool uses [OpenAI](https://platform.openai.com) `gpt-4o-mini` and an OpenAI API token is required.

Alternatively, you can use GitHub Models by providing a GitHub token instead.

## Installation

```bash
npm install @humanwhocodes/social-changelog
```

## CLI Usage

The command line interface requires either an OpenAI API key or a GitHub token to be set in the environment:

```bash
# Using OpenAI API
export OPENAI_API_KEY=your-api-key

# OR using GitHub Models
export GITHUB_TOKEN=your-github-token
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
- `--prompt-file` - (Optional) Path to a file containing a custom prompt to use instead of the default
- `--help, -h` - Show help information

### CLI Examples

Generate post for latest release:

```bash
npx social-changelog --org humanwhocodes --repo social-changelog
```

Use a custom prompt file:

```bash
npx social-changelog --org humanwhocodes --repo social-changelog --prompt-file ./my-prompt.txt
```

By default, the `org/repo` will be used as the project name. You can override this by providing the `--name` option:

```bash
npx social-changelog --org humanwhocodes --repo social-changelog --name "Social Changelog"
```

The latest release will be used by default. You can override this by providing the `--tag` option:

```bash
npx social-changelog --org humanwhocodes --repo social-changelog --name "Social Changelog" --tag v1.0.0
```

**Note:** The tag name must contain a semver-formatted version number.

The CLI outputs the post onto the console so you can capture it or pipe it into another tool.

### GitHub Workflow Example

If you'd like to use Social Changelog in a GitHub Actions workflow file, you can access information directly from the actions environment to fill in the organization and repository names like this:

```yaml
# Generates the social media post using OpenAI
- run: npx @humanwhocodes/social-changelog --org ${{ github.repository_owner }} --repo ${{ github.event.repository.name }} > social-post.txt
  if: ${{ steps.release.outputs.release_created }}
  env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Alternatively, you can use GitHub Models instead of OpenAI by using the built-in [`GITHUB_TOKEN`](https://docs.github.com/en/github-models/integrating-ai-models-into-your-development-workflow#using-ai-models-with-github-actions):

```yaml
# be sure to set permissions for models
permissions:
  models: read

# Generates the social media post using GitHub Models
- run: npx @humanwhocodes/social-changelog --org ${{ github.repository_owner }} --repo ${{ github.event.repository.name }} > social-post.txt
  if: ${{ steps.release.outputs.release_created }}
  env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## API Usage

### Post Generators

The library provides two post generator classes:

- `ResponseAPIPostGenerator` (also exported as `PostGenerator` for backwards compatibility) - Uses OpenAI's Responses API
- `ChatCompletionPostGenerator` - Uses the Chat Completions API, compatible with both OpenAI and GitHub Models

```javascript
import {
	ResponseAPIPostGenerator,
	ChatCompletionPostGenerator,
} from "@humanwhocodes/social-changelog";

// Create generator instance with OpenAI API using Responses API
const openaiGenerator = new ResponseAPIPostGenerator(
	process.env.OPENAI_API_KEY,
	{
		prompt: "Optional custom prompt",
	},
);

// Or use GitHub Models with Chat Completions API
const githubGenerator = new ChatCompletionPostGenerator(
	process.env.GITHUB_TOKEN,
	{
		baseUrl: "https://models.github.ai/inference/",
		model: "openai/gpt-4.1-mini",
		prompt: "Optional custom prompt",
	},
);

// Generate a post (works with either generator)
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
