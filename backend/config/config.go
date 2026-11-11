package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	GinMode             string
	IdempiereAPIBaseURL string
	IdempiereDBHost     string
	IdempiereDBPort     string
	IdempiereDBUser     string
	IdempiereDBPassword string
	IdempiereDBName     string
	IdempiereDBSSLMode  string
	CORSAllowedOrigins  []string
	ERP                 *IdempiereERPConfig
}

func LoadConfig() (*Config, error) {
	// Load .env if present (ignore error if not present in container/prod)
	_ = godotenv.Load()

	cfg := &Config{
		Port:                getEnv("PORT", "8080"),
		GinMode:             getEnv("GIN_MODE", "debug"),
		IdempiereAPIBaseURL: strings.TrimRight(getEnv("IDEMPIERE_API_BASE_URL", "https://adyago-idempiere-13.stampingadyawinsa.com/api/v1"), "/"),
		IdempiereDBHost:     getEnv("IDEMPIERE_DB_HOST", "100.103.195.31"),
		IdempiereDBPort:     getEnv("IDEMPIERE_DB_PORT", "5432"),
		IdempiereDBUser:     getEnv("IDEMPIERE_DB_USER", "adempiere"),
		IdempiereDBPassword: getEnv("IDEMPIERE_DB_PASSWORD", "iDempiere2024Secure!"),
		IdempiereDBName:     getEnv("IDEMPIERE_DB_NAME", "idempiere"),
		IdempiereDBSSLMode:  getEnv("IDEMPIERE_DB_SSLMODE", "disable"),
		ERP:                 LoadIdempiereERPConfig(),
	}

	origins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
	cfg.CORSAllowedOrigins = strings.Split(origins, ",")
	for i := range cfg.CORSAllowedOrigins {
		cfg.CORSAllowedOrigins[i] = strings.TrimSpace(cfg.CORSAllowedOrigins[i])
	}

	return cfg, nil
}

func (c *Config) GetDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.IdempiereDBHost,
		c.IdempiereDBPort,
		c.IdempiereDBUser,
		c.IdempiereDBPassword,
		c.IdempiereDBName,
		c.IdempiereDBSSLMode,
	)
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

