/**
 * @fileoverview Tests for the PostGenerator class.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import assert from "node:assert";
import { PostGenerator } from "../src/post-generator.js";
import { MockServer, FetchMocker } from "mentoss";

//-----------------------------------------------------------------------------
// Data
//-----------------------------------------------------------------------------

const OPENAI_TOKEN = "test-token-123";
const MOCK_PROMPT = "You are a social media expert. Create engaging posts.";

const MOCK_RELEASE = {
    url: "https://github.com/user/repo/releases/v1.0.0",
    tagName: "v1.0.0",
    version: "1.0.0",
    details: "Added new features and fixed bugs"
};

const MOCK_COMPLETION_RESPONSE = {
    choices: [{
        message: {
            content: "🎉 Exciting release! Project v1.0.0 is out with awesome new features. Check it out! #opensource"
        }
    }]
};

const server = new MockServer("https://api.openai.com");
const fetchMocker = new FetchMocker({
    servers: [server]
});

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("PostGenerator", () => {

    beforeEach(() => {
        fetchMocker.mockGlobal();
    });

    afterEach(() => {
        fetchMocker.unmockGlobal();
        server.clear();
    });

    describe("constructor", () => {
        it("should throw when token is missing", () => {
            assert.throws(
                () => new PostGenerator(),
                /Missing OpenAI API token/
            );
        });

        it("should throw an error when token isn't a string", () => {
            assert.throws(
                () => new PostGenerator(123),
                /OpenAI API token isn't a string/
            );
        });
        
        it("should create instance with token and prompt", () => {
            const generator = new PostGenerator(OPENAI_TOKEN, {
                prompt: MOCK_PROMPT
            });
            assert.ok(generator instanceof PostGenerator);
        });
    });

    describe("generateSocialPost()", () => {
        it("should generate post using provided prompt", async () => {
            server.post("/v1/chat/completions", {
                status: 200,
                body: MOCK_COMPLETION_RESPONSE,
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${OPENAI_TOKEN}`
                }
            });

            const generator = new PostGenerator(OPENAI_TOKEN, {
                prompt: MOCK_PROMPT
            });

            const post = await generator.generateSocialPost("testproject", MOCK_RELEASE);
            assert.strictEqual(post, MOCK_COMPLETION_RESPONSE.choices[0].message.content);
        });

        it("should generate post using prompt from file when no prompt provided", async () => {
            server.post("/v1/chat/completions", {
                status: 200,
                body: MOCK_COMPLETION_RESPONSE,
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${OPENAI_TOKEN}`
                }
            });

            const generator = new PostGenerator(OPENAI_TOKEN);
            const post = await generator.generateSocialPost("testproject", MOCK_RELEASE);
            assert.strictEqual(post, MOCK_COMPLETION_RESPONSE.choices[0].message.content);
        });

        it("should handle API errors", async () => {
            server.post("/v1/chat/completions", {
                status: 500,
                body: { error: "Internal Server Error" }
            });

            const generator = new PostGenerator(OPENAI_TOKEN, {
                prompt: MOCK_PROMPT
            });

            await assert.rejects(
                () => generator.generateSocialPost("testproject", MOCK_RELEASE),
                /500/
            );
        });

        it("should handle missing completion response", async () => {
            server.post("/v1/chat/completions", {
                status: 200,
                body: { choices: [] }
            });

            const generator = new PostGenerator(OPENAI_TOKEN, {
                prompt: MOCK_PROMPT
            });

            const post = await generator.generateSocialPost("testproject", MOCK_RELEASE);
            assert.strictEqual(post, undefined);
        });
    });
});
