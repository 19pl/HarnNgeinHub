package main

import (
	"github.com/harnngeinhub/backend/internal/database"
    "github.com/harnngeinhub/backend/internal/routes"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load() // Loads .env file
	database.ConnectDB()
	r := routes.SetupRouter()
	r.Run(":8080")
}