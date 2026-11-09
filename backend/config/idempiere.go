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
	PODocTypeID          int
	PODefaultCurrencyID  int
	PODefaultPricelistID int
	PODefaultPriority    string
	PODefaultPaymentRule string
	PODefaultPaymentTerm int
	PODefaultTaxID       int
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
		PODocTypeID:          getEnvAsInt("IDEMPIERE_DOC_TYPE_PURCHASE_ORDER_ID", 1000016),
		PODefaultCurrencyID:  getEnvAsInt("IDEMPIERE_PO_CURRENCY_ID", 303),
		PODefaultPricelistID: getEnvAsInt("IDEMPIERE_PO_PRICELIST_ID", 1000208),
		PODefaultPriority:    getEnv("IDEMPIERE_PO_PRIORITY_RULE", "5"),
		PODefaultPaymentRule: getEnv("IDEMPIERE_PO_PAYMENT_RULE", "P"),
		PODefaultPaymentTerm: getEnvAsInt("IDEMPIERE_PO_PAYMENT_TERM_ID", 1000007),
		PODefaultTaxID:       getEnvAsInt("IDEMPIERE_PO_CHARGE_TAX_ID", 1000001),
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
