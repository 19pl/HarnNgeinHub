package utils

import (
	"encoding/json"
	"net/http"
)

type apiResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// JSON writes a JSON response with the given status code
func JSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

// Success sends a successful JSON response
func Success(w http.ResponseWriter, data interface{}, status int) {
	JSON(w, status, apiResponse{Success: true, Data: data})
}

// Error sends an error JSON response
func Error(w http.ResponseWriter, message string, status int) {
	JSON(w, status, apiResponse{Success: false, Error: message})
}
