package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Settlement struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	FromUser  primitive.ObjectID `bson:"fromUser" json:"fromUser"`
	ToUser    primitive.ObjectID `bson:"toUser" json:"toUser"`
	Amount    float64            `bson:"amount" json:"amount"`
	GroupID   primitive.ObjectID `bson:"groupId" json:"groupId"`
	Status    string             `bson:"status" json:"status"` // "pending" or "completed"
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}
