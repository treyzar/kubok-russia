# Go → Java/Spring Boot Migration

This document explains the architectural mapping between the existing Go
backend and the Java/Spring Boot port located in `backend-java/`. It is the
authoritative reference for anyone adding features to either codebase.

## 1. Architectural Analysis (current Go system)

The Go backend (`backend/`) is split into **three processes** sharing one
Postgres + one Redis:

| Go service                   | Responsibility                                         |
|------------------------------|--------------------------------------------------------|
| `services/api`               | HTTP (Huma + Gin) + WebSocket fan-out                  |
| `services/room_manager`      | `RoomStarter` & `RoomFinisher` crons (1 s tick)        |
| `services/bot_manager`       | `BotManager` cron (10 s tick)                          |

Cross-cutting libraries:

- `pgx/v5 + pgxpool` — DB driver/pool (no ORM; `sqlc`-generated repo).
- `go-redis/v9` — Redis client used both for cache and for `room.events.{id}`
  pub/sub.
- `huma/v2` — typed OpenAPI handlers on top of `gin`.
- `eon` — lightweight cron-style scheduler.

Two room subsystems coexist:

- **Classic rooms** (`rooms`, `room_players`, `room_winners`, `room_boosts`,
  `room_places`) — int32 IDs, jackpot/boost mechanics, template-driven.
- **Fair rooms** (`fair_rooms`, `fair_players`) — UUID, risk levels
  (low/medium/high), seed-phrase commit/reveal scheme, atomic refund algorithm.

WebSocket endpoint `/api/v1/rooms/{room_id}/ws` bridges Redis pub/sub channel
`room.events.{room_id}` to all subscribed clients.

## 2. Go → Java Component Map

| Go (package / file)                                                | Java (package / class)                                                            |
|--------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| `services/api/main.go` (HTTP entrypoint)                           | `OnlineShopApplication` + Spring auto-config                                      |
| `services/room_manager/main.go` (cron host)                        | `@EnableScheduling` + `scheduler/RoomStarterJob`, `RoomFinisherJob`               |
| `services/bot_manager/main.go`                                     | `scheduler/BotManagerJob`                                                          |
| `internal/domain/fair_room.go` (enums + structs)                   | `domain/enums/{RiskLevel,FairRoomState}` + `domain/entity/{FairRoom,FairPlayer}`  |
| `internal/service/room_service.go` (atomic fair-room logic)        | `service/FairRoomService`                                                          |
| `internal/service/admin_stats_service.go`                          | `service/AdminStatsService`                                                        |
| `internal/service/template_lifecycle.go`                           | `service/TemplateLifecycleService`                                                 |
| `internal/validator/economic.go`                                   | `service/EconomicValidator`                                                        |
| `internal/repository/{room_repo,player_repo}.go`                   | `repository/{FairRoomRepository,FairPlayerRepository}` (Spring Data JPA)          |
| `repository/` (sqlc-generated classic queries)                     | `repository/{Room,RoomPlayer,RoomBoost,RoomWinner,RoomPlace,RoomTemplate,User}Repository` |
| `internal/handler/room_handler.go` (Huma fair-room handler)        | `controller/FairRoomController`                                                    |
| `handlers/room_handler.go` (Gin classic-room handler, ~810 LOC)    | `controller/RoomController` + `service/RoomService`                                |
| `handlers/admin_handler.go`, `template_handler.go`                 | `controller/AdminController`                                                        |
| `handlers/user_handler.go`                                         | `controller/UserController` + `service/UserService`                                |
| `handlers/ws.go` (WebSocket)                                       | `websocket/RoomWebSocketHandler` + `config/WebSocketConfig`                        |
| `pubsub/` events publisher                                         | `events/EventPublisher`                                                             |
| Redis bridge to WS in `services/api`                               | `events/RoomEventListener` + `config/RedisConfig` (PatternTopic)                   |
| `rng/client.go`                                                    | `service/RngClient` (RestClient + SecureRandom fallback)                           |
| `internal/crons/{room_starter,room_finisher,bot_manager}.go`       | `scheduler/{RoomStarterJob,RoomFinisherJob,BotManagerJob}`                         |
| `errors.go` sentinels (`ErrRoomFull`, `ErrNotAccepting`, …)        | `exception/DomainExceptions.*` + `GlobalExceptionHandler`                          |
| `db/migrations/00000{1..18}_*.sql` (goose)                         | `src/main/resources/db/migration/V1__init_schema.sql` (Flyway, consolidated)       |

## 3. Target Architecture

Single Spring Boot process (one JAR, one container) with three logical layers:

```
┌──────────────────────────────────────────────────────────────────┐
│                    Spring Boot 3.3 / Java 21                     │
├──────────────────────────────────────────────────────────────────┤
│  controller/   ←  REST + WebSocket entrypoints                   │
│  service/      ←  business logic (transactional)                 │
│  scheduler/    ←  @Scheduled jobs replacing room/bot managers    │
│  events/       ←  Redis pub/sub publisher + listener (WS bridge) │
│  repository/   ←  Spring Data JPA over Postgres                  │
│  domain/       ←  JPA entities + enums                           │
└──────────────────────────────────────────────────────────────────┘
       ↑                          ↑                       ↑
       │                          │                       │
┌─────────────┐          ┌────────────────┐      ┌─────────────────┐
│ Postgres 15 │◀────────▶│ HikariCP pool  │      │  Redis 7 pub/sub │
└─────────────┘          └────────────────┘      └─────────────────┘
```

Why **one** process instead of three?

1. The Go split was largely operational, not architectural — all three binaries
   share the same domain model, DB, and Redis. Spring's `@Scheduled` + a small
   thread pool (configured via `TaskScheduler`) provides the same isolation
   without an extra container.
2. Easier ops: one health endpoint, one log stream, one deployment artefact.
3. Horizontal scale is preserved: schedulers are idempotent (state lives in
   Postgres), so multiple replicas are safe behind row-level `FOR UPDATE`
   locks. If strict single-leader execution is required, swap `@Scheduled` for
   ShedLock or an HA cron job.

Tech choices and rationale:

- **Spring Data JPA + Hibernate**, not raw JDBC, because the domain is small
  (~10 tables) and JPA's `@Lock(PESSIMISTIC_WRITE)` cleanly maps to the Go
  `SELECT … FOR UPDATE` pattern. For the few aggregate queries
  (`AdminStatsService`) we use native SQL via `EntityManager`.
- **Flyway**, not Liquibase, mirrors goose's plain-SQL migrations 1:1.
- **Spring WebSocket + Redis MessageListenerContainer**, not Stomp or socket.io,
  matches the Go raw text-frame protocol.
- **Records** for DTOs to keep the wire format close to Go's struct tags.

## 4. Migration Plan (recommended order)

| Phase | Deliverable                                                       | State |
|-------|-------------------------------------------------------------------|-------|
| 0     | Skeleton: pom, application.yml, DB connectivity, hello endpoint   | done  |
| 1     | Schema (Flyway V1) — schema parity with Go migrations             | done  |
| 2     | Domain entities + repositories (classic + fair)                   | done  |
| 3     | Fair-room service + controller (port of `internal/service`)       | done  |
| 4     | Classic room service + controller + RNG client                    | done  |
| 5     | Admin: template lifecycle, economic validator, stats              | done  |
| 6     | WebSocket fan-out + Redis pub/sub bridge                          | done  |
| 7     | Schedulers (room starter / finisher / bot)                        | done  |
| 8     | Cut over the React frontend (already on `/api/v1/...`) — no change|       |
| 9     | Run both backends side-by-side; mirror traffic; verify parity     |       |
| 10    | Decommission Go services; keep DB & Redis                         |       |

Phases 8-10 are operational and intentionally outside this PR's scope.

## 5. Key Algorithm Parity

### Fair-room atomic refund (`FairRoomService.startGame`)

Identical step ordering to Go `service.StartGame`:

1. `SELECT … FROM fair_rooms WHERE id = ? FOR UPDATE` (`findByIdForUpdate`).
2. State must be `WAITING`, else `ErrNotWaiting` → 400.
3. `SELECT MIN(initial_deposit) … FOR UPDATE` (`findMinDepositForUpdate`).
4. `UPDATE fair_rooms SET final_fee = ?, state = 'REFUNDING'`.
5. For each player: compute `refund = initial - min`; clamp to ≥ 0; persist;
   call `creditFn` (pluggable hook, default no-op).
6. `UPDATE fair_rooms SET state = 'FINISHED'`.
7. Transaction commits; `game_finished` event published.

### `checkAndScale` (auto-scaling)

Equivalent ratio (`≥70 % of active rooms ≥70 % full → spawn one more`),
non-fatal: failures logged but never propagated to the join response.

### Up-sell visibility

`RiskLevel.ORDER` is a static `Map<RiskLevel, List<RiskLevel>>` mirroring
`domain.RiskLevelOrder`. `listRooms(LOW)` returns LOW + MEDIUM + HIGH.

## 6. Risks & Mitigations

| Risk                                                                | Mitigation                                                                                            |
|---------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Postgres `ENUM` types in Go (`fair_risk_level`, `fair_room_state`)  | Java schema uses `VARCHAR` with JPA `EnumType.STRING`; lowercase Go values become uppercase Java enums. If you must keep ENUMs, write a Hibernate `UserType`. |
| `numeric(18,8)` vs `BigDecimal`                                     | Mapped 1:1; never use `double` for money.                                                              |
| `pgx` advisory locks not portable                                   | Replaced by JPA `LockModeType.PESSIMISTIC_WRITE` (`SELECT … FOR UPDATE`).                              |
| Multi-replica scheduler running the same job twice                   | Jobs are idempotent (DB row locks). For strict single-execution, add **ShedLock** with the existing Postgres or Redis.        |
| `sqlc`-generated nullable pointers (`*int32`, etc.)                 | Java uses boxed types (`Integer`); null-safety enforced via `Optional` on repository methods.          |
| Time zones: Go uses `time.Time`, Postgres `TIMESTAMPTZ`             | Java uses `Instant` everywhere; Hibernate is configured `jdbc.time_zone: UTC`.                         |
| Huma OpenAPI metadata lost                                          | Replaced by `springdoc-openapi-starter-webmvc-ui`; spec at `/v3/api-docs`, UI at `/swagger-ui.html`.   |
| Redis pub/sub: lost messages between disconnects                    | Same risk as Go; if guaranteed delivery is required, switch to Redis Streams (consumer groups).        |
| Migration coexistence (goose vs Flyway)                             | Use Flyway only against a fresh DB **or** run a one-time baseline (`baseline-on-migrate=true`).        |
| Bot strategy is currently a stub                                    | Port the real strategy from `internal/crons/bot_manager.go` once the contract is locked.               |

## 7. What is NOT yet ported

- The bot strategy in `BotManagerJob` is a placeholder log-only stub. The Go
  implementation contains specific join/boost heuristics; port them once the
  product behaviour is locked.
- Authentication/authorization: the Go service relies on an upstream gateway.
  Spring Security can be wired in once the auth model is decided (JWT, OIDC,
  …) — it is intentionally absent to avoid prescribing one.
- The classic `RoomFinisher` settles by elapsed `start_time + round_duration`.
  The Go version supports additional knobs (early-finish on full jackpot, …);
  add them if/when needed.
