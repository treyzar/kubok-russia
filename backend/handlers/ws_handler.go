package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/redisclient"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// WSHandler handles WebSocket connections for real-time room updates.
type WSHandler struct {
	PubSub *redisclient.PubSub
}

// Handle upgrades the HTTP connection to WebSocket, subscribes to the room's Redis channel,
// and relays messages to the client until it disconnects.
func (h *WSHandler) Handle(c *gin.Context) {
	roomIDStr := c.Param("room_id")
	roomID64, err := strconv.ParseInt(roomIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid room_id"})
		return
	}
	roomID := int32(roomID64)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WSHandler] upgrade error for room %d: %v", roomID, err)
		return
	}
	defer conn.Close()

	ctx := c.Request.Context()
	sub := h.PubSub.Subscribe(ctx, roomID)
	defer sub.Close()

	// 30-second ping/pong keepalive
	conn.SetReadDeadline(time.Now().Add(35 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(35 * time.Second))
		return nil
	})

	// Goroutine: send pings every 30 seconds
	pingDone := make(chan struct{})
	go func() {
		defer close(pingDone)
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	ch := sub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload)); err != nil {
				log.Printf("[WSHandler] write error for room %d: %v", roomID, err)
				return
			}
		case <-ctx.Done():
			return
		}
	}
}
