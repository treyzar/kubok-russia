package handlers

import (
	"context"

	"backend/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

type LoginInput struct {
	Body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
}

type LoginOutput struct {
	Body struct {
		Token string `json:"token"`
	}
}

func (h AuthHandler) Login(ctx context.Context, input *LoginInput) (*LoginOutput, error) {
	out := &LoginOutput{}
	out.Body.Token = "stub-token"
	return out, nil
}

var _ huma.Context = nil
