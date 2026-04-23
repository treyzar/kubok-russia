-- name: CreateUser :one
INSERT INTO users (name, balance)
VALUES ($1, $2)
RETURNING *;

-- name: GetUser :one
SELECT * FROM users
WHERE id = $1;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;

-- name: CountBots :one
SELECT COUNT(*) FROM users WHERE bot = true;

-- name: CreateBot :one
INSERT INTO users (name, balance, bot)
VALUES ($1, $2, true)
RETURNING *;

-- name: IncreaseBalanceForLowBalanceBots :exec
UPDATE users
SET balance = balance + $1
WHERE balance < $2 AND bot = true;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY id ASC;

-- name: UpdateUserBalance :one
UPDATE users SET balance = balance + $2
WHERE id = $1 AND balance + $2 >= 0
RETURNING *;

-- name: IncreaseUserBalance :one
UPDATE users SET balance = balance + $2
WHERE id = $1 AND $2 >= 0
RETURNING *;

-- name: DecreaseUserBalance :one
UPDATE users SET balance = balance - $2
WHERE id = $1 AND balance >= $2 AND $2 >= 0
RETURNING *;

-- name: SetUserBalance :one
UPDATE users SET balance = $2
WHERE id = $1 AND $2 >= 0
RETURNING *;
