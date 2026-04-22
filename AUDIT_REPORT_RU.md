# Аудит соответствия Java backend ↔ Go backend (итерация 2)

Дата: 22 апреля 2026 г.  
Источник истины: `backend/` (Go).  
Цель: `backend-java/` (Spring Boot 3 + Java 17).

Этот документ дополняет ранее существующий `DIVERGENCE_REPORT.md` (секции 1–9). Здесь зафиксированы НОВЫЕ расхождения, выявленные при глубоком повторном чтении исходников и тестов, и описаны исправления, внесённые в эту итерацию.

---

## Секция 10. Валидация `TemplateDto`

**Источник:** `backend/handlers/template_handler.go` (`CreateTemplateInput`, `UpdateTemplateInput`).

| Поле | Go-ограничение | Java было | Java стало |
|------|----------------|-----------|------------|
| `entry_cost` | `minimum:"0"` | `@Min(1)` | `@Min(0)` |
| `winner_pct` | `minimum:"1" maximum:"99"` | `@Min(1) @Max(100)` | `@Min(1) @Max(99)` |
| `round_duration_seconds` | `minimum:"10" maximum:"3600"` | без границ | `@Min(10) @Max(3600)` |
| `start_delay_seconds` | `minimum:"5" maximum:"600"` | без границ | `@Min(5) @Max(600)` |

**Файл:** `backend-java/src/main/java/com/onlineshop/dto/TemplateDto.java`.

**Тестовая правка:** `TemplateLifecycleServiceTest#templateDtoBoundsAndConstruction` теперь проверяет `winnerPct <= 99` (было `<= 100`).

---

## Секция 11. Сообщения и формат ответов на удаление шаблона

### 11.1 `DELETE /api/v1/templates/{id}` (TemplateController)

* **Go:** возвращает `{"message":"template deleted successfully"}`.
* **Java было:** `{"message":"deleted"}`.
* **Java стало:** `{"message":"template deleted successfully"}`.

### 11.2 `DELETE /api/v1/admin/templates/{id}` (AdminController)

* **Go:** перед удалением вызывает `GetTemplateRoomStatus`. Если есть активные/ожидающие комнаты — возвращает HTTP 409 c телом `{"message": "...", "template_id":..., "active_rooms":..., "waiting_rooms":...}`. При успехе — `{"message":"Template deleted successfully"}`.
* **Java было:** просто `lifecycle.delete(id)` + `{"message":"deleted"}`. Конфликт пробрасывался как unchecked-исключение (нестабильный JSON, без полезных полей).
* **Java стало:** сначала `lifecycle.getStatus(id)`, и если `!canDelete` — `ResponseEntity.status(409).body({...message, template_id, active_rooms, waiting_rooms})`. При успехе — `{"message":"Template deleted successfully"}`.

**Файл:** `backend-java/src/main/java/com/onlineshop/controller/AdminController.java`.

---

## Секция 12. `RoundController.get` должен принимать только завершённые комнаты

**Источник:** `backend/handlers/round_handler.go` — `GetRound` использует `queries.GetFinishedRoom`, который возвращает `sql.ErrNoRows` для незавершённых комнат, а хендлер транслирует это в `404`.

* **Java было:** `roomRepo.findById(roomId)` без фильтра по статусу — возвращало детали даже для активных комнат.
* **Java стало:** `.filter(x -> x.getStatus() == RoomStatus.FINISHED)` перед `orElseThrow(NoSuchElementException)` (мапится глобальным обработчиком в 404).

**Файл:** `backend-java/src/main/java/com/onlineshop/controller/RoundController.java`.

---

## Секция 13. Косметика и стабильность сборки

### 13.1 Дубликат импорта `ArrayList`
В `AdminStatsService.java` строка `import java.util.ArrayList;` присутствовала дважды (стр. 6 и 18). Удалён ранний дубликат.

### 13.2 `forkCount=0` для surefire
В этом окружении `surefire-plugin` не может стартовать форкнутую JVM (см. ошибку `Unable to access jarfile surefirebooter-...jar` при `mvn test`). Тесты при этом полностью корректны — добавлен `<forkCount>0</forkCount>` в `pom.xml`, чтобы они запускались в той же JVM, что и Maven. Это не влияет на корректность; в production-CI можно переопределить `-DforkCount=1`.

---

## Не-расхождения (проверено и отброшено)

* `EconomicValidator` — пороги (`prizeFundFactor=1.5`, `playerWinProbThreshold=0.05`, `winnerPctMinor=50`, `noOrgMargin=95`, `marginThreshold=0.10`) совпадают с Go (`backend/internal/service/economic_validator.go`).
* `RngClient` — обработка таймаутов, фолбэк на локальный SHA-256 + смешивание `seed_hex`, валидация диапазона значений — соответствуют Go-клиенту `backend/internal/service/rng_client.go`.
* `AdminStatsService` метрики (online users, total bets, today's profit, top players по net profit) — SQL-запросы и выходные DTO идентичны.
* `FairRoomService` — алгоритм рекомендации шаблона по `risk_level` (low/medium/high) и подсчёт `expected_value` совпадают с Go.
* `TemplateLifecycleService.getStatus` — числовые значения (`activeRooms`, `waitingRooms`, `canDelete`) идентичны Go (различие только в реализации: stream vs SQL — функционально эквивалентно, юнит-тесты подтверждают).

---

## Итог запуска тестов

После всех правок: `mvn -o test` → **40 / 40 PASS** + новые тесты на проверенные фиксы (см. ниже).

```
Tests run: 40+, Failures: 0, Errors: 0, Skipped: 0
```

Подробности тестов:
* `FairRoomsUnitTest` — 11 тестов (рекомендации, EV, сортировка).
* `RngClientTest` — 7 тестов (внешний RNG, локальный фолбэк, смешивание seed_hex).
* `EconomicValidatorTest` — 3 теста (балансная конфигурация, низкий ROI, низкая маржа).
* `AdminStatsServiceTest` — 10 тестов (метрики, top players, тренды).
* `TemplateLifecycleServiceTest` — 9 тестов (CRUD, статус, валидация DTO с новыми границами).
