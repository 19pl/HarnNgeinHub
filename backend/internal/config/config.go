package config

import (
	"os"
)

// Config holds all environment-based configuration
type Config struct {
	MongoURI  string
	DBName    string
	JWTSecret string
	Port      string
}

// Load reads environment variables and returns a Config struct
func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "harnngeinhub"
	}
	return &Config{
		MongoURI:  os.Getenv("MONGODB_URI"),
		DBName:    dbName,
		JWTSecret: os.Getenv("JWT_SECRET"),
		Port:      port,
	}
}
