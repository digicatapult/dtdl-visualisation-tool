# dtdl-visualisation-tool

A CLI tool for visualising dtdl ontologies.

## Prerequisites

`node` >= 20
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
docker compose up
```

To bring up both the `postgres` database and the `dtdl-visualiser` service in docker you may run

```
docker compose up --scale dtdl-visualiser=1
```

The service will be available on `http://localhost:3000`

## Docker

The application can be run in Docker. `sample/energygrid` is automatically parsed at start up.

`docker build -t dtdl-visualiser .` and run with `docker run -p 3000:3000 dtdl-visualiser`.

## Environment variables

| variable name       | required | default                   | description                                                                                                                                  |
| ------------------- | -------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| LOG_LEVEL           | n        | info                      | Logging level. Valid values are [ trace , debug , info , warn , error , fatal ]                                                              |
| CACHE_TTL           | n        | `1000 * 60 * 5`           | Time to live (in seconds) for cached diagrams                                                                                                |
| CACHE_SIZE          | n        | `100`                     | Maximum number of diagrams to cache                                                                                                          |
| SEARCH_THRESHOLD    | n        | `0.4`                     | Threshold for a fuzzy search match. 0.0 is a perfect match, 1.0 matches anything.                                                            |
| DB_HOST             | n        | `localhost`               | The database hostname / host                                                                                                                 |
| DB_NAME             | n        | `dtdl-visualisation-tool` | The database name                                                                                                                            |
| DB_USERNAME         | n        | `postgres`                | The database username                                                                                                                        |
| DB_PASSWORD         | n        | `postgres`                | The database password                                                                                                                        |
| DB_PORT             | n        | `5432`                    | The database port number                                                                                                                     |
| UPLOAD_LIMIT_MB     | n        | `10`                      | Upload limit for DTDLs in MB                                                                                                                 |
| GH_CLIENT_ID        | y        | -                         | See [GitHub Integration](#github-integration)                                                                                                |
| GH_CLIENT_SECRET    | y        | -                         | See [GitHub Integration](#github-integration)                                                                                                |
| GH_PER_PAGE         | n        | `50`                      | The number of results per GitHub API request (max 100)                                                                                       |
| GH_REDIRECT_HOST    | n        | `localhost:3000`          | Host to redirect to for GitHub OAuth callback. See [GitHub Integration](#github-integration)                                                 |
| COOKIE_SESSION_KEYS | y        | -                         | Secret for signed cookies, devDefault `secret`                                                                                               |
| PUPPETEER_ARGS      | n        | ''                        | Comma separated string of puppeteer [launch args](https://pptr.dev/api/puppeteer.launchoptions) e.g. `--no-sandbox,--disable-setuid-sandbox` |

## Database migrations

To migrate up the database started by `docker compose`, run locally

```
npm run db:migrate
```

If you have started both the database and the `dtdl-visualiser` service with `docker compose`, the database will will already be migrated

## GitHub integration

With GitHub integration, users can choose to upload directories of DTDL files to the tool directly from their own private GitHub repositories. A [GitHub App](https://github.com/settings/apps) must be created and configured. Example values for local development:

- Permissions: Contents (Read Only)
- GitHub App name: `dtdl-visualisation-tool` (displayed to user when they authorise)
- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/github/callback`

Create a `.env` at root and set:

- `GH_CLIENT_ID=` to the GitHub App's Client ID.
- `GH_CLIENT_SECRET=` a generated token on the GitHub App.

Additionally end to end tests for GitHub integration require envs from a test user in GitHub with a single repository that contains valid DTDL at root. [Example user and repo](https://github.com/jonathanmgray/dtdl).

- `GH_TEST_USER=` the account email address.
- `GH_TEST_PASSWORD=` the account password.
- `GH_TEST_2FA_SECRET=` the secret shown by clicking `setup key` when [setting up 2FA](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication) for the account.

## Testing

This repository consists of two test types: [**e2e**, **unit**] and we are using a combination of `mocha`, `chai` and `sinon` frameworks.

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

E2E tests use `playwright` and are described in`test/`.

Install dependencies for playwright with:

```sh
npx playwright install
```

See [GitHub Integration](#github-integration) for how to configure envs for GitHub e2e tests.

Then run:

```sh
npm run test:e2e
```

A browser window will pop up where you can run tests and follow their progress. Alternatively run the tests without the ui:

```sh
npm run test:playwright
```

Test results are placed in `playwright-report`.

### Debugging testcontainers

When running test and you want to see logs from `testcontainer`, change the run command to include `DEBUG=testcontainers*` like this

```
"test:playwright": "DEBUG=testcontainers* playwright test --trace on --max-failures=1",
```
