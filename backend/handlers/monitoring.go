package handlers

import (
	"context"

	"backend/repository"
)

type MonitoringHandler struct {
	Repo *repository.Queries
}

func (h MonitoringHandler) GetKPI(ctx context.Context, input *EmptyInput) (*EmptyOutput, error) {
	return &EmptyOutput{Body: map[string]any{"message": "kpi stub"}}, nil
}
