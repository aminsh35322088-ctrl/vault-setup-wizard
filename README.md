# Runner Vault Setup Wizard

A standalone Cloudflare Worker, deployed at https://vault-setup-wizard.amin3532.workers.dev, that provisions a user's fork of
[`aminsh35322088-ctrl/GitHub-runner-vault`](https://github.com/aminsh35322088-ctrl/GitHub-runner-vault).

The Wizard uses a central GitHub App for GitHub identity, fork discovery, repository access,
encrypted Actions-secret creation and workflow dispatch. The user supplies only a scoped
Cloudflare API Token; no personal access token is requested.

## User flow

1. Authorize the GitHub App's user authorization flow. The Wizard obtains the account login and numeric ID.
2. Discover the user's existing fork by checking its `parent.full_name`. If absent, provide a one-click GitHub fork link.
3. Install the central GitHub App on that fork only.
4. Paste a Cloudflare API Token. The Wizard verifies it and lists the Cloudflare accounts available to it.
5. The Wizard encrypts `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` using GitHub's repository public key and stores them as Actions secrets.
6. The Wizard dispatches the existing `.github/workflows/deploy.yml` on `main`.
7. It polls the workflow run, reads `deployment.json`, validates the resulting `workers.dev` URL and returns it.

The Cloudflare token is never written to KV, D1, cookies, logs or source files. It exists only in the
incoming request while the Worker validates it and sends it to GitHub's encrypted-secret API.
The GitHub user access token is held in a short-lived, AES-GCM encrypted, HttpOnly cookie; it is
not exposed to page JavaScript. The GitHub App installation token is minted just-in-time and is
not persisted.

## Create the central GitHub App (one-time maintainer setup)

Create one GitHub App owned by the Vault maintainer account. This is a central app; end users
install it on their own fork.

**General**
- App name: `Runner Vault Setup` (or another globally unique name).
- Homepage URL: `https://vault-setup-wizard.amin3532.workers.dev`.
- Callback URL: `https://vault-setup-wizard.amin3532.workers.dev/api/github/callback`.
- Setup URL: `https://vault-setup-wizard.amin3532.workers.dev/api/github/installed`.
- Webhook: inactive; no webhook events are required.
- User authorization callback must use the callback URL above.

**Repository permissions**
- Actions: Read and write (create Actions secrets and dispatch the deployment workflow).
- Contents: Read-only (read `deployment.json` after deployment).
- Metadata: Read-only (GitHub's mandatory repository metadata permission).

Do not grant Administration, Contents write, or access to all repositories. During installation,
the user should select only their `GitHub-runner-vault` fork.

**Worker secrets** (set with Wrangler; never commit them):
- `GITHUB_APP_ID`: numeric App ID.
- `GITHUB_APP_SLUG`: App slug from its GitHub URL.
- `GITHUB_CLIENT_ID`: App's Client ID.
- `GITHUB_CLIENT_SECRET`: App's Client Secret.
- `GITHUB_APP_PRIVATE_KEY`: generated App private key PEM.
- `APP_SESSION_SECRET`: at least 32 random characters, unique to this deployment.

The App's Client ID/Secret are used only for GitHub's user authorization-code flow. The App private
key is used to mint short-lived installation tokens. The Wizard verifies that the installation
belongs to the same numeric GitHub account that authorized the flow and that the installation
includes the discovered fork.

## Cloudflare API Token required from the end user

Create a Cloudflare API Token with these account-level permissions:
- Workers Scripts: Edit
- D1: Edit
- Account Settings: Read

Limit the token to the intended account. If it can access multiple accounts, the user selects the
target account in the Wizard. The existing Vault workflow provisions D1 and `VAULT_MASTER_KEY`,
deploys the Worker and publishes `deployment.json`.

## Development

```sh
npm install
npm run typecheck
npx wrangler deploy --dry-run
npx wrangler dev --local
```

Configure the six Worker secrets above before exposing the Wizard publicly. Health check:
`GET /health`.

## Security boundaries and limitations

- The Wizard does not create a fork through the API. GitHub's create-fork endpoint has an App
  installation requirement that can force broad destination-account installation access. The
  Wizard instead offers GitHub's one-click fork page, then installs the App on that single fork.
- No user PAT is collected or stored.
- The Wizard never transfers Cloudflare account ownership. The Vault deploy workflow derives the
  Vault's primary owner ID from the fork owner and the Vault's own setup flow remains responsible
  for creating its per-owner GitHub App.
- The user-supplied Cloudflare token is stored only as a GitHub Actions encrypted secret. GitHub
  Actions receives it only at deployment time.
- A GitHub App registration and its private key are central maintainer prerequisites. They cannot
  be created automatically from this Wizard.
