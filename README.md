# SparkPanel

**Self-hosted headless CMS for multi-domain and regional websites.**
Model your content in the admin panel — no code, no restarts — and deliver it
to any frontend through a REST API, or let AI assistants work with it over MCP.

[Русская версия](README.ru.md)

> **Early preview.** APIs and settings may change between versions — see the
> [Roadmap](#roadmap).

## Why SparkPanel

- **Content model you change from the UI.** Add properties to any list right in the
  running panel: string, number, text, HTML (visual or code), list, file, image, table,
  links to other records, links to content types, links to another list's options.
  No schema files, no rebuild, no deploy.
- **Multi-domain values.** One record, many sites: a property can hold one value for
  all domains, an exception "for all except msk", and its own value for a group of
  subdomains (`ekb.example.com`, `spb.example.com`). The API returns the value for the
  requested domain. No duplicated records per city.
- **Ready-made sections.** Page tree, content types with their items, products with
  categories, a media library with sections and S3 storages, users and roles, domains.
- **Trees everywhere.** Any list can be nested; links are picked from a tree with
  whole-branch selection.
- **Editorial safety.** Drafts next to published versions, a change history on every
  list (with author), list backups and full-site backups with one-click restore.
- **REST API for your site.** `/api/v1` by API key: pagination, search, filters by
  property, facets with counts, `expand` for linked records, per-domain values.
  The OpenAPI spec is generated from your list settings — the docs are always current.
- **Built-in MCP server.** Connect Claude, Cursor or any MCP client with a personal
  token: the assistant reads and edits content (drafts included) with exactly your
  permissions, and every change is signed in the history.

## Quick start

Requires Docker with Compose.

```bash
git clone https://github.com/xvandevx/sparkpanel.git
cd sparkpanel/webSite/headless
cp .env.example .env        # set every value: openssl rand -hex 32
docker compose up -d --build
```

Open http://localhost:3000 — the first visit creates the main administrator.

One image runs the panel and the API on a single port; Postgres and MinIO run next to
it. Put any reverse proxy (Caddy, Traefik, nginx) in front for HTTPS.
Details: [webSite/headless/README.md](webSite/headless/README.md).

## Roadmap

- Permissions by role
- Serving built-in storage files from the standalone image
- Webhooks on publish
- English UI

The full list and the plan are in [webSite/headless/README.md](webSite/headless/README.md).

## Stack

NestJS · PostgreSQL · Next.js (built to static files) · Ant Design · S3-compatible storage

## License

[Business Source License 1.1](LICENSE). Use SparkPanel in production for your own
websites and for websites you build for clients. You may not offer SparkPanel to third
parties as a hosted or managed CMS service. Each version becomes Apache 2.0 four years
after its release.
