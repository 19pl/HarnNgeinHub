package api

import (
	"net/http"
	"harnngeinhub/internal/database"
	"harnngeinhub/internal/routes"
)

var app http.Handler

// init() runs exactly once when Vercel spins up the serverless function cold-start
func init() {
	database.ConnectDB()
	app = routes.SetupRouter()
}

// Handler is automatically recognized by Vercel
func Handler(w http.ResponseWriter, r *http.Request) {
	app.ServeHTTP(w, r)
}