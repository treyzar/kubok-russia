# online-shop-java

Java 21 / Spring Boot 3 port of the Go backend (`backend/` in the repo root).

## Quickstart

```bash
# Postgres + Redis must be running locally (or set env vars below).
mvn -f backend-java/pom.xml spring-boot:run
```

### Environment variables

| Variable        | Default                                           |
|-----------------|---------------------------------------------------|
| `PORT`          | `8080`                                            |
| `DATABASE_URL`  | `jdbc:postgresql://localhost:5432/online_shop`    |
| `DB_USER`       | `postgres`                                        |
| `DB_PASSWORD`   | `postgres`                                        |
| `REDIS_HOST`    | `localhost`                                       |
| `REDIS_PORT`    | `6379`                                            |
| `REDIS_PASSWORD`| _(empty)_                                         |
| `RNG_BASE_URL`  | _(empty → local SecureRandom fallback)_           |

Flyway runs `V1__init_schema.sql` on startup against an empty database. Existing
deployments of the Go service may point Spring at the same DB by setting
`spring.flyway.baseline-on-migrate=true` (already enabled in `application.yml`).

## Layout

```
src/main/java/com/onlineshop/
  OnlineShopApplication.java     # entrypoint (@EnableScheduling)
  config/                         # WebSocket + Redis pub/sub wiring
  domain/{enums,entity}/          # JPA entities + enums
  repository/                     # Spring Data JPA repositories
  service/                        # business logic (FairRoom, Room, Admin, ...)
  controller/                     # REST endpoints under /api/v1
  websocket/                      # per-room WS fan-out
  events/                         # Redis pub/sub publisher + bridge listener
  scheduler/                      # @Scheduled jobs (room starter / finisher / bot)
  exception/                      # @ControllerAdvice + sentinel exceptions
  dto/                            # request/response records
  util/                           # SeedGenerator (SHA-256 hex)
src/main/resources/
  application.yml
  db/migration/V1__init_schema.sql
src/test/java/com/onlineshop/
  EconomicValidatorTest.java
```

See `MIGRATION.md` (sibling file) for the full Go → Java mapping.
