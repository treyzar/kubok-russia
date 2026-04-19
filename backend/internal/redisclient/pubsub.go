package redisclient

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// PubSub wraps a Redis client and provides room-scoped publish/subscribe helpers.
type PubSub struct {
	client *redis.Client
}

// New creates a new PubSub helper from an existing Redis client.
func New(client *redis.Client) *PubSub {
	return &PubSub{client: client}
}

// channelName returns the Redis channel name for a given room.
func channelName(roomID int32) string {
	return fmt.Sprintf("room:%d", roomID)
}

// Publish sends payload to the Redis channel for the given room.
func (p *PubSub) Publish(ctx context.Context, roomID int32, payload []byte) error {
	return p.client.Publish(ctx, channelName(roomID), payload).Err()
}

// Subscribe returns a Redis PubSub subscription handle for the given room channel.
func (p *PubSub) Subscribe(ctx context.Context, roomID int32) *redis.PubSub {
	return p.client.Subscribe(ctx, channelName(roomID))
}
