package handlers

import (
	"context"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

type HelloHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

type GreetingRequest struct {
	Name string `query:"name"`
}
type GreetingRespose struct {
	Body struct {
		Message string `json:"message"`
	}
}

func (h *HelloHandler) Get(ctx context.Context, req *GreetingRequest) (*GreetingRespose, error) {
	resp := new(GreetingRespose)

	res, err := h.Repo.Greet(ctx, repository.GreetParams{
		Name: req.Name,
	})
	if err != nil {
		return nil, err
	}

	str, _ := res.(string)
	resp.Body.Message = str

	return resp, nil
}
