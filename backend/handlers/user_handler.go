package handlers

import (
	"context"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserHandler struct {
	Repo *repository.Queries
	Pool *pgxpool.Pool
}

type CreateUserRequest struct {
	Body struct {
		Name    string `json:"name" minLength:"1" maxLength:"255"`
		Balance int32  `json:"balance"`
	}
}

type UserResponse struct {
	Body struct {
		ID        int32  `json:"id"`
		Name      string `json:"name"`
		Balance   int32  `json:"balance"`
		CreatedAt string `json:"created_at"`
	}
}

type GetUserRequest struct {
	ID int32 `path:"id"`
}

type DeleteUserRequest struct {
	ID int32 `path:"id"`
}

type DeleteUserResponse struct {
	Body struct {
		Message string `json:"message"`
	}
}

func (h *UserHandler) Create(ctx context.Context, req *CreateUserRequest) (*UserResponse, error) {
	user, err := h.Repo.CreateUser(ctx, repository.CreateUserParams{
		Name:    req.Body.Name,
		Balance: req.Body.Balance,
	})
	if err != nil {
		return nil, err
	}

	resp := &UserResponse{}
	resp.Body.ID = user.ID
	resp.Body.Name = user.Name
	resp.Body.Balance = user.Balance
	resp.Body.CreatedAt = user.CreatedAt.Time.Format("2006-01-02T15:04:05Z")

	return resp, nil
}

func (h *UserHandler) Get(ctx context.Context, req *GetUserRequest) (*UserResponse, error) {
	user, err := h.Repo.GetUser(ctx, repository.GetUserParams{
		ID: req.ID,
	})
	if err != nil {
		return nil, err
	}

	resp := &UserResponse{}
	resp.Body.ID = user.ID
	resp.Body.Name = user.Name
	resp.Body.Balance = user.Balance
	resp.Body.CreatedAt = user.CreatedAt.Time.Format("2006-01-02T15:04:05Z")

	return resp, nil
}

func (h *UserHandler) Delete(ctx context.Context, req *DeleteUserRequest) (*DeleteUserResponse, error) {
	err := h.Repo.DeleteUser(ctx, repository.DeleteUserParams{
		ID: req.ID,
	})
	if err != nil {
		return nil, err
	}

	resp := &DeleteUserResponse{}
	resp.Body.Message = "User deleted successfully"

	return resp, nil
}
