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
	"github.com/harnngeinhub/backend/internal/services"
	"github.com/harnngeinhub/backend/internal/utils"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type addExpenseRequest struct {
	Title        string               `json:"title"`
	Amount       float64              `json:"amount"`
	PaidBy       string               `json:"paidBy"`
	SplitBetween []models.SplitEntry  `json:"splitBetween"` // empty = split equally
	GroupID      string               `json:"groupId"`
	Category     string               `json:"category"`
}

// AddExpense creates a new expense. If SplitBetween is empty, splits equally among group members.
func AddExpense(w http.ResponseWriter, r *http.Request) {
	var req addExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" || req.Amount <= 0 || req.GroupID == "" || req.PaidBy == "" {
		utils.Error(w, "Title, amount, groupId and paidBy are required", http.StatusBadRequest)
		return
	}

	groupOid, err := primitive.ObjectIDFromHex(req.GroupID)
	if err != nil {
		utils.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}
	paidByOid, err := primitive.ObjectIDFromHex(req.PaidBy)
	if err != nil {
		utils.Error(w, "Invalid paidBy user ID", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// If no custom split provided, split equally among all group members
	splitBetween := req.SplitBetween
	if len(splitBetween) == 0 {
		var group models.Group
		if err = database.GetCollection("groups").FindOne(ctx, bson.M{"_id": groupOid}).Decode(&group); err != nil {
			utils.Error(w, "Group not found", http.StatusNotFound)
			return
		}
		perPerson := req.Amount / float64(len(group.Members))
		for _, m := range group.Members {
			splitBetween = append(splitBetween, models.SplitEntry{UserID: m, Amount: perPerson})
		}
	}

	if req.Category == "" {
		req.Category = "Other"
	}

	expense := models.Expense{
		ID:           primitive.NewObjectID(),
		Title:        req.Title,
		Amount:       req.Amount,
		PaidBy:       paidByOid,
		SplitBetween: splitBetween,
		GroupID:      groupOid,
		Category:     req.Category,
		CreatedAt:    time.Now(),
	}

	if _, err = database.GetCollection("expenses").InsertOne(ctx, expense); err != nil {
		utils.Error(w, "Failed to save expense", http.StatusInternalServerError)
		return
	}
	utils.Success(w, expense, http.StatusCreated)
}

// GetExpensesByGroup returns all expenses for a given group
func GetExpensesByGroup(w http.ResponseWriter, r *http.Request) {
	groupID := mux.Vars(r)["groupId"]
	groupOid, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		utils.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	cursor, err := database.GetCollection("expenses").Find(
		context.Background(), bson.M{"groupId": groupOid},
	)
	if err != nil {
		utils.Error(w, "Failed to fetch expenses", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var expenses []models.Expense
	if err = cursor.All(context.Background(), &expenses); err != nil {
		utils.Error(w, "Failed to decode expenses", http.StatusInternalServerError)
		return
	}
	if expenses == nil {
		expenses = []models.Expense{}
	}
	utils.Success(w, expenses, http.StatusOK)
}

// GetBalances calculates who owes whom in a group using the settlement service
func GetBalances(w http.ResponseWriter, r *http.Request) {
	groupID := mux.Vars(r)["groupId"]
	groupOid, err := primitive.ObjectIDFromHex(groupID)
	if err != nil {
		utils.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Fetch all expenses for the group
	cursor, err := database.GetCollection("expenses").Find(ctx, bson.M{"groupId": groupOid})
	if err != nil {
		utils.Error(w, "Failed to fetch expenses", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var expenses []models.Expense
	cursor.All(ctx, &expenses)

	// Calculate net balance per user (positive = owed money, negative = owes money)
	balances := map[string]float64{}
	for _, exp := range expenses {
		paidBy := exp.PaidBy.Hex()
		balances[paidBy] += exp.Amount
		for _, split := range exp.SplitBetween {
			balances[split.UserID.Hex()] -= split.Amount
		}
	}

	settlements := services.CalculateSettlements(balances)
	utils.Success(w, map[string]interface{}{
		"balances":    balances,
		"settlements": settlements,
	}, http.StatusOK)
}
