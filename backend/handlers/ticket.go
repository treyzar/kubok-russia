package handlers

import (
	"context"

	"backend/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TicketHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

type EmptyInput struct{}

type EmptyOutput struct {
	Body map[string]any `json:"body"`
}

func (h TicketHandler) Post(ctx context.Context, input *EmptyInput) (*EmptyOutput, error) {
	return &EmptyOutput{Body: map[string]any{"message": "create ticket stub"}}, nil
}

func (h TicketHandler) List(ctx context.Context, input *EmptyInput) (*EmptyOutput, error) {
	return &EmptyOutput{Body: map[string]any{"message": "list tickets stub"}}, nil
}

func (h TicketHandler) Get(ctx context.Context, input *EmptyInput) (*EmptyOutput, error) {
	return &EmptyOutput{Body: map[string]any{"message": "get ticket stub"}}, nil
}

func (h TicketHandler) Update(ctx context.Context, input *EmptyInput) (*EmptyOutput, error) {
	return &EmptyOutput{Body: map[string]any{"message": "update ticket stub"}}, nil
}
