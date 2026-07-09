# JobApp

## Cursor Cloud specific instructions

Current repository state (as of environment setup): this repo is an **empty scaffold**.
The only tracked file besides this one is `README.md` (a single `# JobApp` heading).
There is **no application code, no package manifest, no services, and no build/test/lint tooling yet**.

Because of that, there is currently nothing to build, run, lint, or test. Do not
fabricate an application to satisfy a "run the app" request — first confirm with the
task what stack/product is intended, or wait for application code to be committed.

Environment runtimes available on the VM (for whenever code is added):

- Node.js `v22.x` + npm `10.x`
- Python `3.12`
- Go `1.22`
- Docker is **not** installed by default (install it explicitly if a future stack needs it).

The startup update script is intentionally minimal and guarded: it installs
dependencies only if a recognized manifest exists (`package.json` -> `npm install`,
`requirements.txt` -> `pip install -r requirements.txt`). When you introduce a real
stack, update the startup update script and this section with the actual
install/run/test commands.
