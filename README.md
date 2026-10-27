# Kartik Gupta — Space Portfolio

A 3D solar-system portfolio built with TanStack Start. Every project is a planet,
and the project list and problem-solving stats are both fetched live.

- **Projects** come from the GitHub API — the top 8 repositories by stars, then by
  most recent push, placed into eight fixed orbit slots.
- **Stats** come from the Codolio API (problems solved, rating, contests, badges,
  active days, streak, submissions).

Both are fetched server-side (CORS, and GitHub's unauthenticated rate limit),
cached for 30 minutes, and fall back to a bundled snapshot if an API is
unreachable — so the page always renders.

## Development

You need Node.js and npm.

```sh
npm install
npm run dev
```

| Script | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run test` | Unit tests |
| `npm run lint` | ESLint + Prettier |

## Deploying

The build uses [Nitro](https://nitro.build), so the target is chosen by a preset.
The default is Cloudflare, which is what the Lovable integration deploys.

### Vercel

`vercel.json` already pins everything needed, so importing the repository is
enough — no dashboard configuration required:

```jsonc
{
  "framework": null,              // don't apply Vercel's Vite preset
  "installCommand": "npm ci",     // both bun.lock and package-lock.json exist;
                                  // Vercel checks bun.lock first, and a Bun
                                  // build makes Nitro emit a bun1.x function
  "buildCommand": "NITRO_PRESET=vercel npm run build"
}
```

That produces `.vercel/output` in Vercel's
[Build Output API v3](https://vercel.com/docs/build-output-api/v3) format: static
assets under `static/`, and the SSR handler as a single Node function. The Node
version is pinned by `engines.node` in `package.json`.

To reproduce the Vercel build locally:

```sh
NITRO_PRESET=vercel npm run build
```

### Other targets

Set `NITRO_PRESET` to any [Nitro preset](https://nitro.build/deploy) — for
example `node-server` for a plain Node server, or `netlify`. Leaving it unset
builds for Cloudflare.

## Built with

- TanStack Start · React · TypeScript
- three.js via React Three Fiber
- Tailwind CSS
