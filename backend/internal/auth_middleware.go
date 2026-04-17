package internal

import (
	"net/http"
	"strings"

	"backend/repository"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware(repo *repository.Queries) gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/v1/public/") || strings.HasPrefix(c.Request.URL.Path, "/api/v1/docs") {
			c.Next()
			return
		}

		if c.GetHeader("X-User-ID") == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-ID"})
			return
		}

		c.Next()
	}
}
