package controllers

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/harnngeinhub/backend/internal/database"
	"github.com/harnngeinhub/backend/internal/models"
	"github.com/harnngeinhub/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GetUsers returns all users — admin only
func GetUsers(w http.ResponseWriter, r *http.Request) {
	cursor, err := database.GetCollection("users").Find(context.Background(), bson.M{})
	if err != nil {
		utils.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var users []models.User
	cursor.All(context.Background(), &users)

	// Convert to safe response (no passwords)
	var result []models.UserResponse
	for _, u := range users {
		result = append(result, u.ToResponse())
	}
	if result == nil {
		result = []models.UserResponse{}
	}
	utils.Success(w, result, http.StatusOK)
}

// GetUserByID returns a single user's public info
func GetUserByID(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var user models.User
	if err = database.GetCollection("users").FindOne(context.Background(), bson.M{"_id": oid}).Decode(&user); err != nil {
		utils.Error(w, "User not found", http.StatusNotFound)
		return
	}
	utils.Success(w, user.ToResponse(), http.StatusOK)
}
