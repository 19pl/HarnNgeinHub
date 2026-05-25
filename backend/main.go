package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/harnngeinhub/backend/internal/database"
	"github.com/harnngeinhub/backend/internal/middleware"
	"github.com/harnngeinhub/backend/internal/routes"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env variables")
	}

	database.ConnectDB()

	r := mux.NewRouter()

	r.Use(mux.CORSMethodMiddleware(r))

	routes.Setup(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running locally on http://localhost:%s", port)
	
	if err := http.ListenAndServe(":"+port, middleware.CORS(r)); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}