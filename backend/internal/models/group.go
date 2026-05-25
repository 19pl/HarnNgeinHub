package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Group struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	Name      string               `bson:"name" json:"name"`
	Members   []primitive.ObjectID `bson:"members" json:"members"`
	CreatedBy primitive.ObjectID   `bson:"createdBy" json:"createdBy"`
	CreatedAt time.Time            `bson:"createdAt" json:"createdAt"`
}
