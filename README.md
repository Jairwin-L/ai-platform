# ai-platform

pnpm workspace monorepo.

| Path            | Package    | Description                                                           |
| --------------- | ---------- | --------------------------------------------------------------------- |
| `apps/platform` | `platform` | Next.js app, migrated from `nextjs-starter-kit` with full git history |

## Getting started

```bash
pnpm install          # install all workspace dependencies (also sets up git hooks)
pnpm dev              # pnpm --filter platform dev
pnpm build            # pnpm --filter platform build
pnpm verify           # vp run verify in apps/platform
```

Run app-specific scripts with `pnpm --filter platform <script>` or from inside `apps/platform`.

## Docker

The build context is the workspace root:

```bash
docker build -f apps/platform/Dockerfile --target runner .
```
