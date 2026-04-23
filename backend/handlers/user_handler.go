package handlers

import (
	"context"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/danielgtaylor/huma/v2"
	"github.com/jackc/pgx/v5"
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
		ID        int32     `json:"id"`
		Name      string    `json:"name"`
		Balance   int32     `json:"balance"`
		CreatedAt time.Time `json:"created_at"`
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
	resp.Body.CreatedAt = user.CreatedAt

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
	resp.Body.CreatedAt = user.CreatedAt

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

// --- List users ---

type ListUsersResponse struct {
	Body struct {
		Users []userItem `json:"users"`
	}
}

type userItem struct {
	ID        int32     `json:"id"`
	Name      string    `json:"name"`
	Balance   int32     `json:"balance"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *UserHandler) List(ctx context.Context, _ *struct{}) (*ListUsersResponse, error) {
	users, err := h.Repo.ListUsers(ctx)
	if err != nil {
		return nil, err
	}

	resp := &ListUsersResponse{}
	resp.Body.Users = make([]userItem, len(users))
	for i, u := range users {
		resp.Body.Users[i] = userItem{
			ID:        u.ID,
			Name:      u.Name,
			Balance:   u.Balance,
			CreatedAt: u.CreatedAt,
		}
	}
	return resp, nil
}

// --- Update balance ---

type UpdateBalanceRequest struct {
	ID   int32 `path:"id"`
	Body struct {
		Delta int32 `json:"delta"`
	}
}

func (h *UserHandler) UpdateBalance(ctx context.Context, req *UpdateBalanceRequest) (*UserResponse, error) {
	user, err := h.Repo.UpdateUserBalance(ctx, repository.UpdateUserBalanceParams{
		ID:      req.ID,
		Balance: req.Body.Delta,
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, huma.Error422UnprocessableEntity("balance cannot go below zero", nil)
		}
		return nil, err
	}

	resp := &UserResponse{}
	resp.Body.ID = user.ID
	resp.Body.Name = user.Name
	resp.Body.Balance = user.Balance
	resp.Body.CreatedAt = user.CreatedAt
	return resp, nil
}

// --- Increase balance ---

type IncreaseBalanceRequest struct {
	ID   int32 `path:"id"`
	Body struct {
		Amount int32 `json:"amount" minimum:"0"`
	}
}

func (h *UserHandler) IncreaseBalance(ctx context.Context, req *IncreaseBalanceRequest) (*UserResponse, error) {
	user, err := h.Repo.IncreaseUserBalance(ctx, repository.IncreaseUserBalanceParams{
		ID:      req.ID,
		Balance: req.Body.Amount,
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, huma.Error404NotFound("user not found or invalid amount", nil)
		}
		return nil, err
	}

	resp := &UserResponse{}
	resp.Body.ID = user.ID
	resp.Body.Name = user.Name
	resp.Body.Balance = user.Balance
	resp.Body.CreatedAt = user.CreatedAt
	return resp, nil
}

// --- Decrease balance ---

type DecreaseBalanceRequest struct {
	ID   int32 `path:"id"`
	Body struct {
		Amount int32 `json:"amount" minimum:"0"`
	}
}

func (h *UserHandler) DecreaseBalance(ctx context.Context, req *DecreaseBalanceRequest) (*UserResponse, error) {
	user, err := h.Repo.DecreaseUserBalance(ctx, repository.DecreaseUserBalanceParams{
		ID:      req.ID,
		Balance: req.Body.Amount,
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, huma.Error422UnprocessableEntity("insufficient balance or invalid amount", nil)
		}
		return nil, err
	}

	resp := &UserResponse{}
	resp.Body.ID = user.ID
	resp.Body.Name = user.Name
	resp.Body.Balance = user.Balance
	resp.Body.CreatedAt = user.CreatedAt
	return resp, nil
}

// --- Set balance ---

type SetBalanceRequest struct {
	ID   int32 `path:"id"`
	Body struct {
		Balance int32 `json:"balance" minimum:"0"`
	}
}

func (h *UserHandler) SetBalance(ctx context.Context, req *SetBalanceRequest) (*UserResponse, error) {
	user, err := h.Repo.SetUserBalance(ctx, repository.SetUserBalanceParams{
		ID:      req.ID,
		Balance: req.Body.Balance,
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, huma.Error404NotFound("user not found or invalid balance", nil)
		}
		return nil, err
	}

	resp := &UserResponse{}
	resp.Body.ID = user.ID
	resp.Body.Name = user.Name
	resp.Body.Balance = user.Balance
	resp.Body.CreatedAt = user.CreatedAt
	return resp, nil
}
