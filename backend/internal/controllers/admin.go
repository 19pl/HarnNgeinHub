package controllers

import (
	"context"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/harnngeinhub/backend/internal/database"
	"github.com/harnngeinhub/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// GetAdminStats returns platform-wide stats for the admin dashboard
func GetAdminStats(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	userCount, _ := database.GetCollection("users").CountDocuments(ctx, bson.M{})
	groupCount, _ := database.GetCollection("groups").CountDocuments(ctx, bson.M{})
	expenseCount, _ := database.GetCollection("expenses").CountDocuments(ctx, bson.M{})

	// Sum all expense amounts
	cursor, _ := database.GetCollection("expenses").Find(ctx, bson.M{})
	defer cursor.Close(ctx)
	var totalAmount float64
	for cursor.Next(ctx) {
		var doc bson.M
		cursor.Decode(&doc)
		if amt, ok := doc["amount"].(float64); ok {
			totalAmount += amt
		}
	}

	utils.Success(w, map[string]interface{}{
		"totalUsers":    userCount,
		"totalGroups":   groupCount,
		"totalExpenses": expenseCount,
		"totalAmount":   totalAmount,
	}, http.StatusOK)
}

// AdminDeleteUser deletes any user by ID
func AdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}
	database.GetCollection("users").DeleteOne(context.Background(), bson.M{"_id": oid})
	utils.Success(w, map[string]string{"message": "User deleted"}, http.StatusOK)
}

// AdminDeleteGroup deletes any group by ID
func AdminDeleteGroup(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}
	database.GetCollection("groups").DeleteOne(context.Background(), bson.M{"_id": oid})
	database.GetCollection("expenses").DeleteMany(context.Background(), bson.M{"groupId": oid})
	utils.Success(w, map[string]string{"message": "Group deleted"}, http.StatusOK)
}
