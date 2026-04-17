package handlers

import (
	"context"

	"backend/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HeatmapHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

func (h HeatmapHandler) GetPoints(ctx context.Context, input *EmptyInput) (*EmptyOutput, error) {
	return &EmptyOutput{Body: map[string]any{"message": "heatmap points stub"}}, nil
}
