package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/harnngeinhub/backend/internal/database"
	"github.com/harnngeinhub/backend/internal/routes"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env variables")
	}

	// 2. Connect to MongoDB
	database.ConnectDB()

	// 3. Initialize the Gorilla Mux Router
	r := mux.NewRouter()
	r.Use(mux.CORSMethodMiddleware)

	// 4. Pass the router to your Setup function in routes.go
	routes.Setup(r)

	// 5. Start the server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running locally on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, middleware.CORS(r)); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}