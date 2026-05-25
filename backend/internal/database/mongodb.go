package database

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// DB is the exported database instance
var DB *mongo.Database

// ConnectDB initializes the MongoDB connection
func ConnectDB() {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		log.Fatal("MONGODB_URI environment variable is missing in .env file")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal("MongoDB connection error: ", err)
	}

	// Ping the database to verify connection
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Could not ping MongoDB: ", err)
	}

	// Replace "harnngein_db" with your actual database name if different
	DB = client.Database("harnngein_db")
	log.Println("Successfully connected to MongoDB Atlas!")
}

// GetCollection is the helper function your controllers are looking for
func GetCollection(collectionName string) *mongo.Collection {
	if DB == nil {
		log.Fatal("Database connection is not initialized yet!")
	}
	return DB.Collection(collectionName)
}