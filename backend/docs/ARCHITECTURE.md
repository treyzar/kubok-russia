# Backend Architecture

Service layout (adapted from `TicketService`, renamed to `backend`):

- `services/api` - API bootstrap, router, route registration
- `handlers` - HTTP handlers by domain (auth, tickets, statistics, heatmap, monitoring)
- `internal` - app config, middleware, DB/Redis bootstrap
- `repository` - sqlc-generated/query layer
- `db/migrations` - goose migrations
- `db/queries` - sqlc SQL queries
- `docs` - API and architecture docs
- `mock` - seed and mock scripts
