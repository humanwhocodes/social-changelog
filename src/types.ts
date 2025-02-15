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

export interface GptMessage {
    role: string;
    content: string;
}

export interface GptChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: GptMessage;
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface CLIArgs {
    org: string | undefined;
    repo: string | undefined;
    name: string | undefined;
    tag: string | undefined;
    help: boolean | undefined;
}
