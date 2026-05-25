package routes

import (
	"net/http"
	"github.com/gorilla/mux"
	"github.com/harnngeinhub/backend/internal/controllers"
	"github.com/harnngeinhub/backend/internal/middleware"
)

// Setup registers all API routes with middleware chains
func Setup(r *mux.Router) {
	api := r.PathPrefix("/api").Subrouter()

	// ── Auth (public) ────────────────────────────────────────
	auth := api.PathPrefix("/auth").Subrouter()
	auth.HandleFunc("/register", controllers.Register).Methods("POST")
	auth.HandleFunc("/login", controllers.Login).Methods("POST")
	auth.Handle("/me", middleware.ValidateJWT(handler(controllers.GetMe))).Methods("GET")

	// ── Groups (auth required) ───────────────────────────────
	groups := api.PathPrefix("/groups").Subrouter()
	groups.Use(middleware.ValidateJWT)
	groups.HandleFunc("", controllers.GetGroups).Methods("GET")
	groups.HandleFunc("", controllers.CreateGroup).Methods("POST")
	groups.HandleFunc("/{id}", controllers.GetGroup).Methods("GET")
	groups.HandleFunc("/{id}", controllers.DeleteGroup).Methods("DELETE")
	groups.HandleFunc("/{id}/join", controllers.JoinGroup).Methods("POST")

	// ── Expenses (auth required) ─────────────────────────────
	expenses := api.PathPrefix("/expenses").Subrouter()
	expenses.Use(middleware.ValidateJWT)
	expenses.HandleFunc("", controllers.AddExpense).Methods("POST")
	expenses.HandleFunc("/group/{groupId}", controllers.GetExpensesByGroup).Methods("GET")
	expenses.HandleFunc("/balances/{groupId}", controllers.GetBalances).Methods("GET")

	// ── Users (auth required) ────────────────────────────────
	users := api.PathPrefix("/users").Subrouter()
	users.Use(middleware.ValidateJWT)
	users.HandleFunc("", controllers.GetUsers).Methods("GET")
	users.HandleFunc("/{id}", controllers.GetUserByID).Methods("GET")

	// ── Admin (auth + admin role required) ───────────────────
	admin := api.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.ValidateJWT)
	admin.Use(middleware.AdminOnly)
	admin.HandleFunc("/stats", controllers.GetAdminStats).Methods("GET")
	admin.HandleFunc("/user/{id}", controllers.AdminDeleteUser).Methods("DELETE")
	admin.HandleFunc("/group/{id}", controllers.AdminDeleteGroup).Methods("DELETE")
}

// handler wraps a plain http.HandlerFunc into http.Handler
func handler(fn func(http.ResponseWriter, *http.Request)) http.Handler {
	return http.HandlerFunc(fn)
}
