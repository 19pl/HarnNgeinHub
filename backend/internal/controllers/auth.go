package controllers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/harnngeinhub/backend/internal/database"
	"github.com/harnngeinhub/backend/internal/middleware"
	"github.com/harnngeinhub/backend/internal/models"
	"github.com/harnngeinhub/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Register creates a new user account
func Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Basic validation
	if req.Username == "" || req.Email == "" || req.Password == "" {
		utils.Error(w, "Username, email and password are required", http.StatusBadRequest)
		return
	}
	if len(req.Password) < 6 {
		utils.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	col := database.GetCollection("users")
	ctx := context.Background()

	// Check if email already exists
	var existing models.User
	err := col.FindOne(ctx, bson.M{"email": strings.ToLower(req.Email)}).Decode(&existing)
	if err == nil {
		utils.Error(w, "Email already registered", http.StatusConflict)
		return
	}

	// Hash password
	hashed, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.Error(w, "Error processing password", http.StatusInternalServerError)
		return
	}

	user := models.User{
		ID:        primitive.NewObjectID(),
		Username:  req.Username,
		Email:     strings.ToLower(req.Email),
		Password:  hashed,
		Role:      "user",
		CreatedAt: time.Now(),
	}

	if _, err = col.InsertOne(ctx, user); err != nil {
		utils.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	token, err := utils.GenerateToken(user.ID.Hex(), user.Role)
	if err != nil {
		utils.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	utils.Success(w, map[string]interface{}{
		"token": token,
		"user":  user.ToResponse(),
	}, http.StatusCreated)
}

// Login authenticates a user and returns a JWT
func Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	col := database.GetCollection("users")
	ctx := context.Background()

	var user models.User
	err := col.FindOne(ctx, bson.M{"email": strings.ToLower(req.Email)}).Decode(&user)
	if err != nil {
		utils.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if !utils.CheckPassword(user.Password, req.Password) {
		utils.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	token, err := utils.GenerateToken(user.ID.Hex(), user.Role)
	if err != nil {
		utils.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	utils.Success(w, map[string]interface{}{
		"token": token,
		"user":  user.ToResponse(),
	}, http.StatusOK)
}

// GetMe returns the currently authenticated user's profile
func GetMe(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	oid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		utils.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	col := database.GetCollection("users")
	var user models.User
	if err = col.FindOne(context.Background(), bson.M{"_id": oid}).Decode(&user); err != nil {
		utils.Error(w, "User not found", http.StatusNotFound)
		return
	}

	utils.Success(w, user.ToResponse(), http.StatusOK)
}
