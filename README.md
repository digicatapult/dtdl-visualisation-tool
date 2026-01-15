# dtdl-visualisation-tool

A CLI tool for visualising dtdl ontologies.

## Prerequisites

`node` >= 24
Docker

## Getting started

The build command should be run first to create the converted ts files.

```shell
npm i
npm run build
```

Start postgres and migrate to latest:

```sh
docker compose up -d
npm run db:migrate
```

To install npm CLI tool. It will be linked to local binaries so can be executed as `dtdl-visualiser`

```shell
npm i -g
```

## using CLI

```sh
dtdl-visualiser help
```

### parse

Attempts to parse every DTDL JSON file within the supplied directory and its sub-directories. Files are combined and parsed as a single JSON to ensure resolutions between entities are resolved correctly. If parsing is successful, the server starts.

```sh
dtdl-visualiser parse -P <http-server-port> -p <path-to-dtdl-ontology-directory>
```

For example:

```sh
dtdl-visualiser parse -p sample/energygrid
```

Go to http://localhost:3000

### validate

Attempts to validate every DTDL JSON file within the supplied directory and its sub-directories. Files are validated one at a time. The process exits immediately if a file fails validation.

```sh
dtdl-visualiser validate -p <path-to-dtdl-ontology-directory>
```

For example:

```sh
dtdl-visualiser validate -p sample/energygrid
```

By default, validation ignores `ResolutionException`s that occur when parsing a single entity that references another entity. To include Resolution exceptions in validation add `-r`:

```sh
dtdl-visualiser validate -p sample/energygrid -r
```

## Docker Compose

To bring up the `postgres` database service on port `5432`, run

```
docker compose up -d
```

To bring up both the `postgres` database and the `dtdl-visualiser` service in docker you may run

```
docker compose up --scale dtdl-visualiser=1 -d
```

The service will be available on `http://localhost:3000`

## Docker

The application can be run in Docker. `sample/energygrid` is automatically parsed at start up.

`docker build -t dtdl-visualiser .` and run with `docker run -p 3000:3000 dtdl-visualiser`.

## Environment variables

| variable name            | required | default                   | description                                                                                                                                  |
| ------------------------ | -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| LOG_LEVEL                | n        | info                      | Logging level. Valid values are [ trace , debug , info , warn , error , fatal ]                                                              |
| CACHE_TTL                | n        | `1000 * 60 * 5`           | Time to live (in seconds) for cached diagrams                                                                                                |
| CACHE_SIZE               | n        | `100`                     | Maximum number of diagrams to cache                                                                                                          |
| SEARCH_THRESHOLD         | n        | `0.4`                     | Threshold for a fuzzy search match. 0.0 is a perfect match, 1.0 matches anything.                                                            |
| DB_HOST                  | n        | `localhost`               | The database hostname / host                                                                                                                 |
| DB_NAME                  | n        | `dtdl-visualisation-tool` | The database name                                                                                                                            |
| DB_USERNAME              | n        | `postgres`                | The database username                                                                                                                        |
| DB_PASSWORD              | n        | `postgres`                | The database password                                                                                                                        |
| DB_PORT                  | n        | `5432`                    | The database port number                                                                                                                     |
| UPLOAD_LIMIT_MB          | n        | `10`                      | Upload limit for DTDLs in MB                                                                                                                 |
| GH_APP_NAME              | y        | -                         | See [GitHub Integration](#github-integration)                                                                                                |
| GH_APP_PRIVATE_KEY       | y        | -                         | See [GitHub Integration](#github-integration)                                                                                                |
| GH_CLIENT_ID             | y        | -                         | See [GitHub Integration](#github-integration)                                                                                                |
| GH_CLIENT_SECRET         | y        | -                         | See [GitHub Integration](#github-integration)                                                                                                |
| GH_API_BASE_URL          | n        | -                         | Base URL for GitHub API requests (for mocking in tests)                                                                                      |
| GH_OAUTH_BASE_URL        | n        | -                         | Base URL for GitHub OAuth authorization (for mocking in tests)                                                                               |
| GH_OAUTH_TOKEN_BASE_URL  | n        | -                         | Base URL for GitHub OAuth token endpoint (for mocking in tests)                                                                              |
| GH_PER_PAGE              | n        | `50`                      | The number of results per GitHub API request (max 100)                                                                                       |
| GH_REDIRECT_ORIGIN       | n        | `http://localhost:3000`   | Origin to redirect to for GitHub OAuth callback. See [GitHub Integration](#github-integration)                                               |
| COOKIE_SESSION_KEYS      | y        | -                         | Secret for signed cookies, devDefault `secret`                                                                                               |
| PUPPETEER_ARGS           | n        | ''                        | Comma separated string of puppeteer [launch args](https://pptr.dev/api/puppeteer.launchoptions) e.g. `--no-sandbox,--disable-setuid-sandbox` |
| EDIT_ONTOLOGY            | n        | 'false'                   | Edit toggle is disabled on all ontologys when false and works as normal when true                                                            |
| JSON_DEPTH_LIMIT         | n        | '10'                      | Maximum depth allowed of DTDL files                                                                                                          |
| MAX_DTDL_OBJECT_SIZE     | n        | '1000'                    | Maximum number of DTDL objects allowed in a single ontology                                                                                  |
| STRICT_RATE_LIMIT        | n        | '1000'                    | Number of requests allowed per client on strict routes within the `RATE_LIMIT_WINDOW_MS`                                                     |
| GLOBAL_RATE_LIMIT        | n        | '10000'                   | Number of requests allowed per client on all routes within the `RATE_LIMIT_WINDOW_MS`                                                        |
| IP_ALLOW_LIST            | n        | -                         | Comma separated IPs that can make unlimited requests                                                                                         |
| RATE_LIMIT_WINDOW_MS     | n        | '10 _ 60 _ 1000'          | How long client requests are counted before resetting                                                                                        |
| POSTHOG_ENABLED          | n        | 'false'                   | Feature flag for PostHog analytics tracking                                                                                                  |
| NEXT_PUBLIC_POSTHOG_KEY  | n        | ''                        | API key for Posthog dashboard                                                                                                                |
| NEXT_PUBLIC_POSTHOG_HOST | n        | ''                        | endpoint for Posthog dashboard                                                                                                               |
| IUBENDA_ENABLED          | n        | 'false'                   | Feature flag for Iubenda Privacy Policy widget                                                                                               |
| IUBENDA_WIDGET_ID        | n        | 'bfba4c13...'             | Widget ID for Iubenda privacy policy and cookie policy                                                                                       |

## GitHub integration

With GitHub integration, users can choose to upload directories of DTDL files to the tool directly from their own private GitHub repositories. A public [GitHub App](https://github.com/settings/apps) must be created and configured. Example values for local development:

- Permissions: Contents (Read & Write), Pull Requests (Read & Write), Metadata (Read)
- GitHub App name: `dtdl-visualisation-tool` (displayed to user when they authorise)
- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/github/callback`

Create a `.env` at root and set:

- `GH_APP_NAME=` to the GitHub App's name.
- `GH_APP_PRIVATE_KEY=` to the GitHub App's private key (not to be confused with client secret) as a base64 encoded string. To convert a `.pem` file to base64:

  ```sh
  base64 -i your-app-private-key.pem | tr -d '\n'
  ```

- `GH_CLIENT_ID=` to the GitHub App's Client ID (not to be confused with the App ID)
- `GH_CLIENT_SECRET=` a generated token on the GitHub App.

Additionally end to end tests for GitHub integration require envs of a user in GitHub:

- `GH_TEST_USER=` the account email address.
- `GH_TEST_PASSWORD=` the account password.
- `GH_TEST_2FA_SECRET=` the secret shown by clicking `setup key` when [setting up 2FA](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication).

## Analytics

This tool integrates with PostHog for both server-side and client-side analytics tracking. Analytics are disabled by default and can be enabled by setting `POSTHOG_ENABLED=true` and providing a `NEXT_PUBLIC_POSTHOG_KEY`.

**Privacy & Features:**

- **Anonymous by Default**: Users are tracked with a random UUID stored in a cookie.
- **GitHub Identity**: If a user logs in via GitHub, their analytics are securely aliased to their GitHub identity.
- **What is tracked**:
  - **Server-side**: Ontology uploads, searches, view changes (diagram type, expansion), and errors.
  - **Client-side**: Standard page views and interaction events.

## Privacy Policy

This tool integrates with Iubenda for privacy policy and cookie policy compliance. The widget is disabled by default (opt-in) and can be enabled by setting `IUBENDA_ENABLED=true`.

**Configuration:**

- **Widget ID**: Configure using `IUBENDA_WIDGET_ID` to point to your Iubenda privacy policy.
- **Display**: The widget appears in the bottom right corner of all pages, providing users access to Privacy Policy and Cookie Policy.
- **Testing**: The widget is disabled in test environments by default to prevent interference with E2E tests.

## Testing

This repository consists of two test types: [**e2e**, **unit**] and we are using a combination of `mocha`, `chai` and `sinon` frameworks.

**Important**: During tests, `.env` overrides `test/test.env` values. Keep external services (PostHog, Iubenda) **disabled** in `.env` to prevent test interference. See `.github/copilot-instructions.md` for detailed environment loading behavior.

### Unit Testing

Unit tests are per service/module or class, and follow the below pattern. In **tests** directories collated with the units they test.

```sh
# example
├── __tests__
│   ├── example.test.ts
│   ├── __tests__
│   │   ├── index.test.ts
├── __tests__
....
```

Unit tests are executed by running:

```sh
npm run test:unit
```

### End to End Testing

E2E tests use `playwright` and are described in `test/`. Install dependencies with:

```sh
npx playwright install
```

Most E2E tests use WireMock to mock the GitHub API. WireMock stubs are configured in `test/mocks/wiremock/mappings/`.

The `github.spec.ts` test file performs a real OAuth flow with GitHub and requires test user credentials (see [GitHub Integration](#github-integration) for configuration):

- `GH_TEST_USER` - GitHub test account email
- `GH_TEST_PASSWORD` - GitHub test account password
- `GH_TEST_2FA_SECRET` - TOTP secret for 2FA

Run all E2E tests:

```sh
npm run test:playwright
```

Run with Playwright UI:

```sh
npm run test:e2e
```

Test results are placed in `playwright-report`.

### Debugging testcontainers

When running test and you want to see logs from `testcontainer`, change the run command to include `DEBUG=testcontainers*` like this

```
"test:playwright": "DEBUG=testcontainers* playwright test --trace on --max-failures=1",
```
