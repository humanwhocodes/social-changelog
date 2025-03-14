/**
 * @fileoverview Types for this package.
 * @author Nicholas C. Zakas
 */

export interface GitHubRelease {
	url: string;
	assets_url: string;
	upload_url: string;
	html_url: string;
	id: number;
	author: {
		login: string;
		id: number;
		node_id: string;
		avatar_url: string;
		gravatar_id: string;
		url: string;
		html_url: string;
		followers_url: string;
		following_url: string;
		gists_url: string;
		starred_url: string;
		subscriptions_url: string;
		organizations_url: string;
		repos_url: string;
		events_url: string;
		received_events_url: string;
		type: string;
		site_admin: boolean;
	};
	node_id: string;
	tag_name: string;
	target_commitish: string;
	name: string;
	draft: boolean;
	prerelease: boolean;
	created_at: string;
	published_at: string;
	assets: Array<{
		url: string;
		id: number;
		node_id: string;
		name: string;
		label: string;
		uploader: {
			login: string;
			id: number;
			node_id: string;
			avatar_url: string;
			gravatar_id: string;
			url: string;
			html_url: string;
			followers_url: string;
			following_url: string;
			gists_url: string;
			starred_url: string;
			subscriptions_url: string;
			organizations_url: string;
			repos_url: string;
			events_url: string;
			received_events_url: string;
			type: string;
			site_admin: boolean;
		};
		content_type: string;
		state: string;
		size: number;
		download_count: number;
		created_at: string;
		updated_at: string;
		browser_download_url: string;
	}>;
	tarball_url: string;
	zipball_url: string;
	body: string;
}

export interface ReleaseInfo {
	tagName: string;
	version: string;
	url: string;
	details: string;
}

export interface OpenAIResponseContent {
	type: "output_text";
	text: string;
	annotations: Array<unknown>;
}

export interface OpenAIResponseMessage {
	type: "message";
	id: string;
	status: string;
	role: string;
	content: Array<OpenAIResponseContent>;
}

export interface OpenAIResponse {
	id: string;
	object: "response";
	created_at: number;
	status: string;
	error: null | object;
	incomplete_details: null | object;
	instructions: null | string;
	max_output_tokens: null | number;
	model: string;
	output: Array<OpenAIResponseMessage>;
	parallel_tool_calls: boolean;
	previous_response_id: null | string;
	reasoning: {
		effort: null | string;
		summary: null | string;
	};
	store: boolean;
	temperature: number;
	text: {
		format: {
			type: string;
		};
	};
	tool_choice: string;
	tools: Array<unknown>;
	top_p: number;
	truncation: string;
	usage: {
		input_tokens: number;
		input_tokens_details: {
			cached_tokens: number;
		};
		output_tokens: number;
		output_tokens_details: {
			reasoning_tokens: number;
		};
		total_tokens: number;
	};
	user: null | string;
	metadata: object;
}

export interface CLIArgs {
	org: string | undefined;
	repo: string | undefined;
	name: string | undefined;
	tag: string | undefined;
	help: boolean | undefined;
}
