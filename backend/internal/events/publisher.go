package events

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal/redisclient"
)

// RoomEvent is the envelope for all room-scoped pub/sub messages.
type RoomEvent struct {
	Type      string      `json:"type"`
	RoomID    int32       `json:"room_id"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// PlayerJoinedData is the payload for "player_joined" events.
type PlayerJoinedData struct {
	UserID int32 `json:"user_id"`
	Places int32 `json:"places"`
}

// BoostAppliedData is the payload for "boost_applied" events.
type BoostAppliedData struct {
	UserID int32 `json:"user_id"`
	Amount int32 `json:"amount"`
}

// RoomStartingData is the payload for "room_starting" events.
type RoomStartingData struct {
	StartTime        time.Time `json:"start_time"`
	CountdownSeconds int32     `json:"countdown_seconds"`
}

// GameFinishedData is the payload for "game_finished" events.
type GameFinishedData struct {
	WinnerID int32 `json:"winner_id"`
	Prize    int32 `json:"prize"`
}

// EventPublisher publishes room events to Redis pub/sub channels.
type EventPublisher struct {
	pubSub *redisclient.PubSub
}

// NewEventPublisher creates a new EventPublisher backed by the given PubSub client.
func NewEventPublisher(pubSub *redisclient.PubSub) *EventPublisher {
	return &EventPublisher{pubSub: pubSub}
}

// publish serialises the event and sends it to the room channel.
func (p *EventPublisher) publish(ctx context.Context, roomID int32, eventType string, data interface{}) {
	event := RoomEvent{
		Type:      eventType,
		RoomID:    roomID,
		Timestamp: time.Now().UTC(),
		Data:      data,
	}
	payload, err := json.Marshal(event)
	if err != nil {
		log.Printf("[EventPublisher] ❌ Failed to marshal %s event for room %d: %v", eventType, roomID, err)
		return
	}
	if err := p.pubSub.Publish(ctx, roomID, payload); err != nil {
		log.Printf("[EventPublisher] ❌ Failed to publish %s event for room %d: %v", eventType, roomID, err)
	}
}

// PublishPlayerJoined publishes a "player_joined" event (Requirement 1.1).
func (p *EventPublisher) PublishPlayerJoined(ctx context.Context, roomID, userID, places int32) {
	p.publish(ctx, roomID, "player_joined", PlayerJoinedData{UserID: userID, Places: places})
}

// PublishBoostApplied publishes a "boost_applied" event (Requirement 1.2).
func (p *EventPublisher) PublishBoostApplied(ctx context.Context, roomID, userID, amount int32) {
	p.publish(ctx, roomID, "boost_applied", BoostAppliedData{UserID: userID, Amount: amount})
}

// PublishRoomStarting publishes a "room_starting" event with countdown info (Requirements 1.3, 1.6).
func (p *EventPublisher) PublishRoomStarting(ctx context.Context, roomID int32, startTime time.Time) {
	countdown := int32(time.Until(startTime).Seconds())
	if countdown < 0 {
		countdown = 0
	}
	p.publish(ctx, roomID, "room_starting", RoomStartingData{
		StartTime:        startTime,
		CountdownSeconds: countdown,
	})
}

// PublishGameStarted publishes a "game_started" event (Requirement 1.4).
func (p *EventPublisher) PublishGameStarted(ctx context.Context, roomID int32) {
	p.publish(ctx, roomID, "game_started", nil)
}

// PublishGameFinished publishes a "game_finished" event with winner info (Requirement 1.5).
func (p *EventPublisher) PublishGameFinished(ctx context.Context, roomID, winnerID, prize int32) {
	p.publish(ctx, roomID, "game_finished", GameFinishedData{WinnerID: winnerID, Prize: prize})
}
