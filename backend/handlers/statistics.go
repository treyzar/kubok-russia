package handlers

import (
	"context"

	"backend/repository"
)

type StatisticsHandler struct {
	Repo *repository.Queries
}

func (h StatisticsHandler) GetSummary(ctx context.Context, input *EmptyInput) (*EmptyOutput, error) {
	return &EmptyOutput{Body: map[string]any{"message": "statistics summary stub"}}, nil
}
