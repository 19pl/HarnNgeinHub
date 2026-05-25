package controllers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/harnngeinhub/backend/internal/database"
	"github.com/harnngeinhub/backend/internal/middleware"
	"github.com/harnngeinhub/backend/internal/models"
	"github.com/harnngeinhub/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CreateGroup creates a new expense group
func CreateGroup(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	oid, _ := primitive.ObjectIDFromHex(userID)

	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		utils.Error(w, "Group name is required", http.StatusBadRequest)
		return
	}

	group := models.Group{
		ID:        primitive.NewObjectID(),
		Name:      body.Name,
		Members:   []primitive.ObjectID{oid}, // creator is first member
		CreatedBy: oid,
		CreatedAt: time.Now(),
	}

	col := database.GetCollection("groups")
	if _, err := col.InsertOne(context.Background(), group); err != nil {
		utils.Error(w, "Failed to create group", http.StatusInternalServerError)
		return
	}
	utils.Success(w, group, http.StatusCreated)
}

// GetGroups returns all groups the current user is a member of
func GetGroups(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	oid, _ := primitive.ObjectIDFromHex(userID)

	col := database.GetCollection("groups")
	cursor, err := col.Find(context.Background(), bson.M{"members": oid})
	if err != nil {
		utils.Error(w, "Failed to fetch groups", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var groups []models.Group
	if err = cursor.All(context.Background(), &groups); err != nil {
		utils.Error(w, "Failed to decode groups", http.StatusInternalServerError)
		return
	}
	if groups == nil {
		groups = []models.Group{}
	}
	utils.Success(w, groups, http.StatusOK)
}

// GetGroup returns a single group by ID
func GetGroup(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	col := database.GetCollection("groups")
	var group models.Group
	if err = col.FindOne(context.Background(), bson.M{"_id": oid}).Decode(&group); err != nil {
		utils.Error(w, "Group not found", http.StatusNotFound)
		return
	}
	utils.Success(w, group, http.StatusOK)
}

// DeleteGroup deletes a group (only creator or admin)
func DeleteGroup(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	role, _ := r.Context().Value(middleware.RoleKey).(string)
	id := mux.Vars(r)["id"]

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	col := database.GetCollection("groups")
	var group models.Group
	if err = col.FindOne(context.Background(), bson.M{"_id": oid}).Decode(&group); err != nil {
		utils.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	// Only creator or admin can delete
	if group.CreatedBy.Hex() != userID && role != "admin" {
		utils.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	col.DeleteOne(context.Background(), bson.M{"_id": oid})
	database.GetCollection("expenses").DeleteMany(context.Background(), bson.M{"groupId": oid})
	utils.Success(w, map[string]string{"message": "Group deleted"}, http.StatusOK)
}

// JoinGroup adds the current user to a group
func JoinGroup(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	oid, _ := primitive.ObjectIDFromHex(userID)
	id := mux.Vars(r)["id"]
	groupOid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	col := database.GetCollection("groups")
	// $addToSet prevents duplicates
	_, err = col.UpdateOne(context.Background(),
		bson.M{"_id": groupOid},
		bson.M{"$addToSet": bson.M{"members": oid}},
	)
	if err != nil {
		utils.Error(w, "Failed to join group", http.StatusInternalServerError)
		return
	}
	utils.Success(w, map[string]string{"message": "Joined group"}, http.StatusOK)
}
