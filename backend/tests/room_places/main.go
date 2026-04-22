package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/SomeSuperCoder/OnlineShop/internal"
	"github.com/SomeSuperCoder/OnlineShop/repository"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	pool       *pgxpool.Pool
	queries    *repository.Queries
	config     *internal.AppConfig
	testRoomID int32 // Track the room created for tests 2-6
)

// Helper function to join a room with specified number of places
func joinRoomWithPlaces(ctx context.Context, roomID, userID, places int32) (repository.Room, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return repository.Room{}, err
	}
	defer tx.Rollback(ctx)

	txRepo := queries.WithTx(tx)

	// Get room info
	room, err := txRepo.GetRoom(ctx, repository.GetRoomParams{RoomID: roomID})
	if err != nil {
		return repository.Room{}, err
	}

	// Deduct entry cost * places and add to jackpot
	totalCost := room.EntryCost * places
	_, err = txRepo.AddMoneyToJackpot(ctx, repository.AddMoneyToJackpotParams{
		RoomID:  roomID,
		Jackpot: totalCost,
		ID:      userID,
	})
	if err != nil {
		return repository.Room{}, err
	}

	// Get next place index
	nextPlaceIndex, err := txRepo.GetNextPlaceIndex(ctx, repository.GetNextPlaceIndexParams{
		RoomID: roomID,
	})
	if err != nil {
		return repository.Room{}, err
	}

	// Insert places
	for i := int32(0); i < places; i++ {
		placeIndex := nextPlaceIndex + i
		_, err = txRepo.InsertRoomPlace(ctx, repository.InsertRoomPlaceParams{
			RoomID:     roomID,
			UserID:     userID,
			PlaceIndex: placeIndex,
		})
		if err != nil {
			return repository.Room{}, err
		}

		// Insert room_player for each place
		_, err = txRepo.InsertRoomPlayer(ctx, repository.InsertRoomPlayerParams{
			RoomID:  roomID,
			UserID:  userID,
			PlaceID: placeIndex,
		})
		if err != nil {
			return repository.Room{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return repository.Room{}, err
	}

	// Get updated room
	return queries.GetRoom(ctx, repository.GetRoomParams{RoomID: roomID})
}

func main() {
	log.Println("=== Room Places Integration Tests ===")

	// Load config
	config = internal.LoadAppConfig()

	// Connect to database
	var err error
	pool, err = pgxpool.New(context.Background(), config.PostgresURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	queries = repository.New(pool)

	// Run tests
	testsPassed := 0
	testsFailed := 0

	tests := []struct {
		name string
		fn   func() error
	}{
		{"Test 1: Create test users", testCreateUsers},
		{"Test 2: Join room with 1 place", testJoinRoomSinglePlace},
		{"Test 3: Join room with multiple places", testJoinRoomMultiplePlaces},
		{"Test 4: Verify sequential place_index assignment", testSequentialPlaceIndices},
		{"Test 5: Verify place counts in API responses", testPlaceCountsInResponse},
		{"Test 6: Leave room with multiple places (CASCADE delete)", testLeaveRoomCascade},
		{"Test 7: Verify stake calculations with places", testStakeCalculations},
		{"Test 8: Verify stake calculations with boosts", testStakeCalculationsWithBoosts},
		{"Test 9: Verify bot integration with places", testBotIntegration},
		{"Test 10: Verify place_id invariant (room_players.place_id == room_places.place_index)", testPlaceIdInvariant},
		{"Test 11: Cleanup test data", testCleanup},
	}

	for _, test := range tests {
		log.Printf("\n--- Running: %s ---", test.name)
		err := test.fn()
		if err != nil {
			log.Printf("❌ FAILED: %s - %v", test.name, err)
			testsFailed++
		} else {
			log.Printf("✅ PASSED: %s", test.name)
			testsPassed++
		}
	}

	log.Printf("\n=== Test Results ===")
	log.Printf("Passed: %d", testsPassed)
	log.Printf("Failed: %d", testsFailed)

	if testsFailed > 0 {
		os.Exit(1)
	}
}

func testCreateUsers() error {
	// Create test user 1 with balance 5000
	user1, err := queries.CreateUser(context.Background(), repository.CreateUserParams{
		Name:    "PlacesTestUser1",
		Balance: 5000,
	})
	if err != nil {
		return fmt.Errorf("failed to create user1: %v", err)
	}
	log.Printf("Created user1: ID=%d, Balance=%d", user1.ID, user1.Balance)

	// Create test user 2 with balance 3000
	user2, err := queries.CreateUser(context.Background(), repository.CreateUserParams{
		Name:    "PlacesTestUser2",
		Balance: 3000,
	})
	if err != nil {
		return fmt.Errorf("failed to create user2: %v", err)
	}
	log.Printf("Created user2: ID=%d, Balance=%d", user2.ID, user2.Balance)

	// Create test user 3 with balance 4000
	user3, err := queries.CreateUser(context.Background(), repository.CreateUserParams{
		Name:    "PlacesTestUser3",
		Balance: 4000,
	})
	if err != nil {
		return fmt.Errorf("failed to create user3: %v", err)
	}
	log.Printf("Created user3: ID=%d, Balance=%d", user3.ID, user3.Balance)

	return nil
}

func testJoinRoomSinglePlace() error {
	// Create a room with entry cost 100
	room, err := queries.InsertRoom(context.Background(), repository.InsertRoomParams{
		Jackpot: 0,
		StartTime: pgtype.Timestamptz{
			Time:  time.Now().Add(5 * time.Minute),
			Valid: true,
		},
		Status:               "new",
		PlayersNeeded:        5,
		MinPlayers:           1,
		EntryCost:            100,
		WinnerPct:            80,
		GameType:             "train",
		RoundDurationSeconds: 30,
		StartDelaySeconds:    60,
	})
	if err != nil {
		return fmt.Errorf("failed to create room: %v", err)
	}

	// Store the room ID for subsequent tests
	testRoomID = room.RoomID

	// Get user1
	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}
	var user1 repository.User
	for _, u := range users {
		if u.Name == "PlacesTestUser1" {
			user1 = u
			break
		}
	}

	// User1 joins room with 1 place
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user1.ID, 1)
	if err != nil {
		return fmt.Errorf("failed to join room: %v", err)
	}

	// Verify place was created with index 1
	places, err := queries.ListRoomPlacesByUser(context.Background(), repository.ListRoomPlacesByUserParams{
		RoomID: room.RoomID,
		UserID: user1.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to list places: %v", err)
	}

	if len(places) != 1 {
		return fmt.Errorf("expected 1 place, got %d", len(places))
	}

	if places[0].PlaceIndex != 1 {
		return fmt.Errorf("expected place_index 1, got %d", places[0].PlaceIndex)
	}

	// Verify 1 row in room_players
	players, err := queries.ListRoomPlayers(context.Background(), repository.ListRoomPlayersParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to list room_players: %v", err)
	}

	var user1PlayerCount int64
	for _, p := range players {
		if p.UserID == user1.ID {
			user1PlayerCount = p.Places
		}
	}
	if user1PlayerCount != 1 {
		return fmt.Errorf("expected 1 room_players row for user1, got %d", user1PlayerCount)
	}

	log.Printf("User1 joined with 1 place, place_index=%d, room_players rows=1", places[0].PlaceIndex)
	return nil
}

func testJoinRoomMultiplePlaces() error {
	// Use the room from test 2
	room, err := queries.GetRoom(context.Background(), repository.GetRoomParams{RoomID: testRoomID})
	if err != nil {
		return fmt.Errorf("failed to get test room: %v", err)
	}

	// Get user2
	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}
	var user2 repository.User
	for _, u := range users {
		if u.Name == "PlacesTestUser2" {
			user2 = u
			break
		}
	}

	// User2 joins room
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user2.ID, 3)
	if err != nil {
		return fmt.Errorf("failed to join room: %v", err)
	}

	// Verify 3 places were created
	places, err := queries.ListRoomPlacesByUser(context.Background(), repository.ListRoomPlacesByUserParams{
		RoomID: room.RoomID,
		UserID: user2.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to list places: %v", err)
	}

	if len(places) != 3 {
		return fmt.Errorf("expected 3 places, got %d", len(places))
	}

	// Verify 3 rows in room_players for user2
	players, err := queries.ListRoomPlayers(context.Background(), repository.ListRoomPlayersParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to list room_players: %v", err)
	}

	var user2PlayerCount int64
	for _, p := range players {
		if p.UserID == user2.ID {
			user2PlayerCount = p.Places
		}
	}
	if user2PlayerCount != 3 {
		return fmt.Errorf("expected 3 room_players rows for user2, got %d", user2PlayerCount)
	}

	log.Printf("User2 joined with 3 places, room_players rows=3")
	return nil
}

func testSequentialPlaceIndices() error {
	// Use the room from test 2
	room, err := queries.GetRoom(context.Background(), repository.GetRoomParams{RoomID: testRoomID})
	if err != nil {
		return fmt.Errorf("failed to get test room: %v", err)
	}

	// Get user3
	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}
	var user3 repository.User
	for _, u := range users {
		if u.Name == "PlacesTestUser3" {
			user3 = u
			break
		}
	}

	// User3 joins room
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user3.ID, 2)
	if err != nil {
		return fmt.Errorf("failed to join room: %v", err)
	}

	// Verify sequential indices: user1 has 1, user2 has 2,3,4, user3 has 5,6
	// Get all places for the room ordered by place_index
	ctx := context.Background()
	rows, err := pool.Query(ctx, `
		SELECT user_id, place_index 
		FROM room_places 
		WHERE room_id = $1 
		ORDER BY place_index ASC
	`, room.RoomID)
	if err != nil {
		return fmt.Errorf("failed to query places: %v", err)
	}
	defer rows.Close()

	expectedIndices := []int32{1, 2, 3, 4, 5, 6}
	actualIndices := []int32{}

	for rows.Next() {
		var userID, placeIndex int32
		if err := rows.Scan(&userID, &placeIndex); err != nil {
			return fmt.Errorf("failed to scan row: %v", err)
		}
		actualIndices = append(actualIndices, placeIndex)
	}

	if len(actualIndices) != len(expectedIndices) {
		return fmt.Errorf("expected %d places, got %d", len(expectedIndices), len(actualIndices))
	}

	for i, expected := range expectedIndices {
		if actualIndices[i] != expected {
			return fmt.Errorf("place_index mismatch at position %d: expected %d, got %d", i, expected, actualIndices[i])
		}
	}

	log.Printf("Sequential place_index assignment verified: %v", actualIndices)
	return nil
}

func testPlaceCountsInResponse() error {
	// Use the room from test 2
	room, err := queries.GetRoom(context.Background(), repository.GetRoomParams{RoomID: testRoomID})
	if err != nil {
		return fmt.Errorf("failed to get test room: %v", err)
	}

	// Get players with their place counts
	players, err := queries.ListRoomPlayers(context.Background(), repository.ListRoomPlayersParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to list players: %v", err)
	}

	// Verify place counts
	expectedCounts := map[string]int64{
		"PlacesTestUser1": 1,
		"PlacesTestUser2": 3,
		"PlacesTestUser3": 2,
	}

	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}

	userNameMap := make(map[int32]string)
	for _, u := range users {
		userNameMap[u.ID] = u.Name
	}

	foundCount := 0
	for _, player := range players {
		userName := userNameMap[player.UserID]
		expectedCount, exists := expectedCounts[userName]
		if !exists {
			continue // Skip non-test users
		}

		foundCount++
		if player.Places != expectedCount {
			return fmt.Errorf("user %s: expected %d places, got %d", userName, expectedCount, player.Places)
		}
		log.Printf("User %s has correct place count: %d", userName, player.Places)
	}

	if foundCount != 3 {
		return fmt.Errorf("expected to verify 3 test users, only found %d", foundCount)
	}

	return nil
}

func testLeaveRoomCascade() error {
	// Create a new room for this test
	room, err := queries.InsertRoom(context.Background(), repository.InsertRoomParams{
		Jackpot: 0,
		StartTime: pgtype.Timestamptz{
			Time:  time.Now().Add(5 * time.Minute),
			Valid: true,
		},
		Status:               "new",
		PlayersNeeded:        5,
		MinPlayers:           1,
		EntryCost:            100,
		WinnerPct:            80,
		GameType:             "train",
		RoundDurationSeconds: 30,
		StartDelaySeconds:    60,
	})
	if err != nil {
		return fmt.Errorf("failed to create room: %v", err)
	}

	// Get user1
	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}
	var user1 repository.User
	for _, u := range users {
		if u.Name == "PlacesTestUser1" {
			user1 = u
			break
		}
	}

	// User1 joins room
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user1.ID, 4)
	if err != nil {
		return fmt.Errorf("failed to join room: %v", err)
	}

	// Verify 4 places exist in room_places
	placesBefore, err := queries.CountUserPlacesInRoom(context.Background(), repository.CountUserPlacesInRoomParams{
		RoomID: room.RoomID,
		UserID: user1.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to count places: %v", err)
	}

	if placesBefore != 4 {
		return fmt.Errorf("expected 4 places before leave, got %d", placesBefore)
	}

	// Verify 4 rows in room_players before leave
	playersBefore, err := queries.ListRoomPlayers(context.Background(), repository.ListRoomPlayersParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to list room_players before leave: %v", err)
	}
	var roomPlayerCountBefore int64
	for _, p := range playersBefore {
		if p.UserID == user1.ID {
			roomPlayerCountBefore = p.Places
		}
	}
	if roomPlayerCountBefore != 4 {
		return fmt.Errorf("expected 4 room_players rows before leave, got %d", roomPlayerCountBefore)
	}

	// User1 leaves room
	_, err = queries.LeaveRoomAndUpdateStatus(context.Background(), repository.LeaveRoomAndUpdateStatusParams{
		RoomID: room.RoomID,
		UserID: user1.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to leave room: %v", err)
	}

	// Verify all places were deleted via CASCADE in room_places
	placesAfter, err := queries.CountUserPlacesInRoom(context.Background(), repository.CountUserPlacesInRoomParams{
		RoomID: room.RoomID,
		UserID: user1.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to count places after leave: %v", err)
	}

	if placesAfter != 0 {
		return fmt.Errorf("expected 0 places after leave (CASCADE delete), got %d", placesAfter)
	}

	// Verify all room_players rows were deleted (cascade from room_places deletion)
	var roomPlayerCountAfter int64
	ctx := context.Background()
	err = pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM room_players WHERE room_id = $1 AND user_id = $2`,
		room.RoomID, user1.ID,
	).Scan(&roomPlayerCountAfter)
	if err != nil {
		return fmt.Errorf("failed to count room_players after leave: %v", err)
	}

	if roomPlayerCountAfter != 0 {
		return fmt.Errorf("expected 0 room_players rows after leave, got %d", roomPlayerCountAfter)
	}

	log.Printf("CASCADE delete verified: all 4 places and room_players rows removed when user left room")
	return nil
}

func testStakeCalculations() error {
	// Create a new room for stake testing
	room, err := queries.InsertRoom(context.Background(), repository.InsertRoomParams{
		Jackpot: 0,
		StartTime: pgtype.Timestamptz{
			Time:  time.Now().Add(5 * time.Minute),
			Valid: true,
		},
		Status:               "playing",
		PlayersNeeded:        5,
		MinPlayers:           1,
		EntryCost:            100,
		WinnerPct:            80,
		GameType:             "train",
		RoundDurationSeconds: 30,
		StartDelaySeconds:    60,
	})
	if err != nil {
		return fmt.Errorf("failed to create room: %v", err)
	}

	// Get test users
	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}
	var user1, user2, user3 repository.User
	for _, u := range users {
		if u.Name == "PlacesTestUser1" {
			user1 = u
		} else if u.Name == "PlacesTestUser2" {
			user2 = u
		} else if u.Name == "PlacesTestUser3" {
			user3 = u
		}
	}

	// Add users to room with different place counts
	// User1: 2 places
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user1.ID, 2)
	if err != nil {
		return fmt.Errorf("failed to join user1: %v", err)
	}

	// User2: 3 places
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user2.ID, 3)
	if err != nil {
		return fmt.Errorf("failed to join user2: %v", err)
	}

	// User3: 1 place
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user3.ID, 1)
	if err != nil {
		return fmt.Errorf("failed to join user3: %v", err)
	}

	// Get players with stakes
	players, err := queries.GetPlayersWithStakes(context.Background(), repository.GetPlayersWithStakesParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to get players with stakes: %v", err)
	}

	// Verify stakes: entry_cost * places
	expectedStakes := map[int32]int32{
		user1.ID: 200, // 100 * 2
		user2.ID: 300, // 100 * 3
		user3.ID: 100, // 100 * 1
	}

	for _, player := range players {
		expected, exists := expectedStakes[player.UserID]
		if !exists {
			continue
		}

		if player.TotalStake != expected {
			return fmt.Errorf("user %d: expected stake %d, got %d", player.UserID, expected, player.TotalStake)
		}
		log.Printf("User %d has correct stake: %d (entry_cost * places)", player.UserID, player.TotalStake)
	}

	return nil
}

func testStakeCalculationsWithBoosts() error {
	// Create a dedicated room for boost testing with players
	room, err := queries.InsertRoom(context.Background(), repository.InsertRoomParams{
		Jackpot: 0,
		StartTime: pgtype.Timestamptz{
			Time:  time.Now().Add(5 * time.Minute),
			Valid: true,
		},
		Status:               "new", // Changed to "new" so user can join
		PlayersNeeded:        5,
		MinPlayers:           1,
		EntryCost:            100,
		WinnerPct:            80,
		GameType:             "train",
		RoundDurationSeconds: 30,
		StartDelaySeconds:    60,
	})
	if err != nil {
		return fmt.Errorf("failed to create room: %v", err)
	}

	// Get test users
	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}
	var user1 repository.User
	for _, u := range users {
		if u.Name == "PlacesTestUser1" {
			user1 = u
			break
		}
	}

	if user1.ID == 0 {
		return fmt.Errorf("PlacesTestUser1 not found")
	}

	// User1 joins room with 2 places
	_, err = joinRoomWithPlaces(context.Background(), room.RoomID, user1.ID, 2)
	if err != nil {
		return fmt.Errorf("failed to join user1: %v", err)
	}

	// Change room status to playing so we can add a boost
	_, err = queries.SetRoomStatus(context.Background(), repository.SetRoomStatusParams{
		RoomID: room.RoomID,
		Status: "playing",
	})
	if err != nil {
		return fmt.Errorf("failed to set room status: %v", err)
	}

	log.Printf("User1 joined room %d with 2 places, room set to playing", room.RoomID)

	// Add a boost for user1
	boost, err := queries.InsertRoomBoost(context.Background(), repository.InsertRoomBoostParams{
		RoomID: room.RoomID,
		ID:     user1.ID,
		Amount: 150,
	})
	if err != nil {
		return fmt.Errorf("failed to insert boost: %v", err)
	}

	if boost.RoomID == 0 {
		return fmt.Errorf("boost was not inserted (returned empty result)")
	}

	log.Printf("Boost inserted: user_id=%d, amount=%d", user1.ID, boost.Amount)

	// Debug: Check room_players
	playersDebug, err := queries.ListRoomPlayers(context.Background(), repository.ListRoomPlayersParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to list room players for debug: %v", err)
	}
	log.Printf("DEBUG: Room %d has %d players in room_players", room.RoomID, len(playersDebug))
	for _, p := range playersDebug {
		log.Printf("DEBUG: Player user_id=%d, places=%v", p.UserID, p.Places)
	}

	// Get players with stakes
	players, err := queries.GetPlayersWithStakes(context.Background(), repository.GetPlayersWithStakesParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to get players with stakes: %v", err)
	}

	log.Printf("Found %d players with stakes", len(players))

	// Find user1's stake
	var user1Stake int32
	var found bool
	for _, player := range players {
		log.Printf("Player: user_id=%d, places=%d, stake=%d, boost=%d, total_stake=%d",
			player.UserID, player.Places, player.Stake, player.BoostAmount, player.TotalStake)
		if player.UserID == user1.ID {
			user1Stake = player.TotalStake
			found = true
		}
	}

	if !found {
		return fmt.Errorf("user1 not found in players with stakes")
	}

	// Expected: (100 * 2) + 150 = 350
	expectedStake := int32(350)
	if user1Stake != expectedStake {
		return fmt.Errorf("user1 stake with boost: expected %d, got %d", expectedStake, user1Stake)
	}

	log.Printf("User1 stake with boost verified: %d (entry_cost * 2 places + boost)", user1Stake)
	return nil
}

func testBotIntegration() error {
	// Create a room for bot testing
	room, err := queries.InsertRoom(context.Background(), repository.InsertRoomParams{
		Jackpot: 0,
		StartTime: pgtype.Timestamptz{
			Time:  time.Now().Add(5 * time.Minute),
			Valid: true,
		},
		Status:               "playing",
		PlayersNeeded:        5,
		MinPlayers:           1,
		EntryCost:            100,
		WinnerPct:            80,
		GameType:             "train",
		RoundDurationSeconds: 30,
		StartDelaySeconds:    60,
	})
	if err != nil {
		return fmt.Errorf("failed to create room: %v", err)
	}

	// Create a test bot
	bot, err := queries.CreateBot(context.Background(), repository.CreateBotParams{
		Name:    "PlacesTestBot",
		Balance: 1000,
	})
	if err != nil {
		return fmt.Errorf("failed to create bot: %v", err)
	}

	// Bot joins room
	_, err = queries.BotJoinRoom(context.Background(), repository.BotJoinRoomParams{
		RoomID: room.RoomID,
		ID:     bot.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to join bot: %v", err)
	}

	// Get next place index
	nextIndex, err := queries.GetNextPlaceIndex(context.Background(), repository.GetNextPlaceIndexParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to get next place index: %v", err)
	}

	// Insert 2 places for bot
	placesCount := int32(2)
	for i := int32(0); i < placesCount; i++ {
		place, err := queries.InsertRoomPlace(context.Background(), repository.InsertRoomPlaceParams{
			RoomID:     room.RoomID,
			UserID:     bot.ID,
			PlaceIndex: nextIndex + i,
		})
		if err != nil {
			return fmt.Errorf("failed to insert place %d: %v", i+1, err)
		}
		_, err = queries.InsertRoomPlayer(context.Background(), repository.InsertRoomPlayerParams{
			RoomID:  room.RoomID,
			UserID:  bot.ID,
			PlaceID: place.PlaceIndex,
		})
		if err != nil {
			return fmt.Errorf("failed to insert room_player for place %d: %v", i+1, err)
		}
	}

	// Verify bot places in stake calculations
	players, err := queries.GetPlayersWithStakes(context.Background(), repository.GetPlayersWithStakesParams{
		RoomID: room.RoomID,
	})
	if err != nil {
		return fmt.Errorf("failed to get players with stakes: %v", err)
	}

	var botStake int32
	for _, player := range players {
		if player.UserID == bot.ID {
			botStake = player.TotalStake
			break
		}
	}

	expectedStake := int32(200) // 100 * 2
	if botStake != expectedStake {
		return fmt.Errorf("bot stake: expected %d, got %d", expectedStake, botStake)
	}

	log.Printf("Bot integration verified: bot has correct stake %d with 2 places", botStake)
	return nil
}

func testPlaceIdInvariant() error {
	// Use the room from tests 2-5 which should still have players
	room, err := queries.GetRoom(context.Background(), repository.GetRoomParams{RoomID: testRoomID})
	if err != nil {
		return fmt.Errorf("failed to get test room: %v", err)
	}

	ctx := context.Background()

	// Query all room_players rows joined with room_places to verify place_id == place_index
	rows, err := pool.Query(ctx, `
		SELECT rp.user_id, rp.place_id, rpl.place_index, rpl.user_id AS place_user_id
		FROM room_players rp
		JOIN room_places rpl ON rpl.room_id = rp.room_id AND rpl.place_index = rp.place_id
		WHERE rp.room_id = $1
		ORDER BY rp.place_id ASC
	`, room.RoomID)
	if err != nil {
		return fmt.Errorf("failed to query invariant: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID, placeID, placeIndex, placeUserID int32
		if err := rows.Scan(&userID, &placeID, &placeIndex, &placeUserID); err != nil {
			return fmt.Errorf("failed to scan row: %v", err)
		}
		if placeID != placeIndex {
			return fmt.Errorf("invariant violated: room_players.place_id=%d != room_places.place_index=%d for user_id=%d", placeID, placeIndex, userID)
		}
		if userID != placeUserID {
			return fmt.Errorf("invariant violated: room_players.user_id=%d != room_places.user_id=%d for place_id=%d", userID, placeUserID, placeID)
		}
		count++
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("row iteration error: %v", err)
	}

	if count == 0 {
		return fmt.Errorf("no room_players rows found to verify invariant")
	}

	log.Printf("place_id invariant verified for %d room_players rows: place_id == place_index for all entries", count)
	return nil
}

func testCleanup() error {
	// Delete test users
	users, err := queries.ListUsers(context.Background())
	if err != nil {
		return err
	}

	for _, u := range users {
		if u.Name == "PlacesTestUser1" || u.Name == "PlacesTestUser2" || u.Name == "PlacesTestUser3" || u.Name == "PlacesTestBot" {
			err := queries.DeleteUser(context.Background(), repository.DeleteUserParams{ID: u.ID})
			if err != nil {
				log.Printf("Warning: failed to delete user %s: %v", u.Name, err)
			}
		}
	}

	// Delete test rooms
	rooms, err := queries.ListRooms(context.Background())
	if err != nil {
		return err
	}

	for _, r := range rooms {
		err := queries.DeleteRoom(context.Background(), repository.DeleteRoomParams{
			RoomID: r.RoomID,
		})
		if err != nil {
			log.Printf("Warning: failed to delete room %d: %v", r.RoomID, err)
		}
	}

	log.Printf("Cleaned up test data")
	return nil
}
