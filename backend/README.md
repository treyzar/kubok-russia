# backend

Каркас backend-части, воссозданный по архитектуре `SomeSuperCoder/kubok_chuvashii/TicketService`.

## Что уже создано

- Базовая слоистая структура (`handlers -> services/api -> repository`)
- Точки входа для API и middleware
- Каркас инфраструктуры: `.env.example`, `Makefile`, `sqlc.yaml`, `db/docker-compose.yaml`
- Заготовки миграций и SQL-запросов

## Быстрый старт

```bash
cd backend
cp .env.example .env
make databases
make serve
```
