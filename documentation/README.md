# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

Run all commands from the `documentation/` directory.

### Installation

```
$ npm i
```

### Local Development

```
$ npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```
$ USE_SSH=true npm run deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> npm run deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

### Deploying on Your Own GitHub Pages

This repo already includes a GitHub Actions workflow that builds the docs and publishes the static site to the `gh-pages` branch when changes under `documentation/` are pushed to `main`.

For a fork or your own repo:

1. Push the repo to GitHub.
2. In your repository settings, open `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select the `gh-pages` branch and the `/(root)` folder.
5. Push a change under `documentation/` to trigger the workflow in `.github/workflows/deploy-docs-and-extensions.yml`.

By default, the docs site now auto-detects the GitHub repository and builds for the matching project site URL:

- repo `alice/mydocs` -> `https://alice.github.io/mydocs/`
- repo `alice/alice.github.io` -> `https://alice.github.io/`

You can override the deployment target with repository variables:

- `DOCS_SITE_URL`: full site origin, for example `https://docs.example.com`
- `DOCS_BASE_PATH`: base path with or without slashes, for example `/mydocs/` or `/`
- `DOCS_ORGANIZATION_NAME`: optional explicit GitHub owner override
- `DOCS_PROJECT_NAME`: optional explicit GitHub repo override

Those variables are passed into the docs build by the workflow, so you can keep the same source tree while publishing to a different Pages URL or a custom domain.
<!-- trigger deployment -->
