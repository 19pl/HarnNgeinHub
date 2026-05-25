package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SplitEntry tracks how much each person owes for an expense
type SplitEntry struct {
	UserID primitive.ObjectID `bson:"userId" json:"userId"`
	Amount float64            `bson:"amount" json:"amount"`
}

type Expense struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title        string             `bson:"title" json:"title"`
	Amount       float64            `bson:"amount" json:"amount"`
	PaidBy       primitive.ObjectID `bson:"paidBy" json:"paidBy"`
	SplitBetween []SplitEntry       `bson:"splitBetween" json:"splitBetween"`
	GroupID      primitive.ObjectID `bson:"groupId" json:"groupId"`
	Category     string             `bson:"category" json:"category"` // Food, Transport, Entertainment, Other
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
}
