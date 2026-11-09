package config

import (
	"os"
	"strconv"
)

// IdempiereERPConfig contains static business constants and defaults for iDempiere ERP integration.
// Values can be overridden via environment variables or fall back to production defaults.
type IdempiereERPConfig struct {
	DefaultClientID      int
	DefaultOrgID         int
	DefaultClientName    string
	PRDocTypeID          int
	PRDefaultPricelistID int
	PRDefaultPriority    string
}

// LoadIdempiereERPConfig loads ERP-specific configuration with defaults.
func LoadIdempiereERPConfig() *IdempiereERPConfig {
	return &IdempiereERPConfig{
		DefaultClientID:      getEnvAsInt("IDEMPIERE_CLIENT_ID", 1000000),
		DefaultOrgID:         getEnvAsInt("IDEMPIERE_ORG_ID", 0),
		DefaultClientName:    getEnv("IDEMPIERE_TENANT_NAME", "PT. Adyawinsa Plastics Industry"),
		PRDocTypeID:          getEnvAsInt("IDEMPIERE_DOC_TYPE_PURCHASE_REQUISITION_ID", 1000018),
		PRDefaultPricelistID:  getEnvAsInt("IDEMPIERE_PR_DEFAULT_PRICELIST_ID", 1000208),
		PRDefaultPriority:    getEnv("IDEMPIERE_PR_DEFAULT_PRIORITY", "5"),
	}
}

func getEnvAsInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
