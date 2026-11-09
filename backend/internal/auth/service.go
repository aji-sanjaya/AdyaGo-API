package auth

import (
	"fmt"
	"log"
	"strings"

	"factoryhub-go/internal/database"
	"factoryhub-go/internal/idempiere"
)

type Service struct {
	db              *database.DBInstance
	idempiereClient *idempiere.Client
}

func NewService(db *database.DBInstance, idempiereClient *idempiere.Client) *Service {
	return &Service{
		db:              db,
		idempiereClient: idempiereClient,
	}
}

func (s *Service) LoginInitial(req LoginRequest) (*LoginInitialResponse, error) {
	username := strings.TrimSpace(req.Username)
	rawResult, err := s.idempiereClient.Login(username, req.Password)
	if err != nil {
		return nil, fmt.Errorf("authentication failed: %w", err)
	}

	token, _ := rawResult["token"].(string)

	// Determine userId
	var userID int
	if val, ok := rawResult["userId"].(float64); ok {
		userID = int(val)
	} else if val, ok := rawResult["id"].(float64); ok {
		userID = int(val)
	} else if val, ok := rawResult["ad_user_id"].(float64); ok {
		userID = int(val)
	}

	// If userId was not provided in token response, resolve from DB
	if userID == 0 {
		var resolvedID int
		err := s.db.DB.Raw(`
			SELECT ad_user_id 
			FROM ad_user 
			WHERE isactive = 'Y' AND (LOWER(name) = ? OR LOWER(value) = ?) 
			LIMIT 1
		`, strings.ToLower(username), strings.ToLower(username)).Scan(&resolvedID).Error
		if err == nil && resolvedID > 0 {
			userID = resolvedID
		}
	}

	displayName := username
	if val, ok := rawResult["name"].(string); ok && val != "" {
		displayName = val
	}

	email := ""
	if val, ok := rawResult["email"].(string); ok {
		email = val
	}

	userInfo := &UserInfo{
		UserID:   userID,
		Username: username,
		Name:     displayName,
		Email:    email,
	}

	return &LoginInitialResponse{
		Success: true,
		Message: "Credentials verified. Please select tenant, role, and organization.",
		Token:   token,
		User:    userInfo,
		RawData: rawResult,
	}, nil
}

func (s *Service) GetClients() ([]LookupOption, error) {
	var clients []LookupOption
	err := s.db.DB.Raw(`
		SELECT ad_client_id as id, name as text 
		FROM ad_client 
		WHERE isactive = 'Y' AND ad_client_id > 0 
		ORDER BY name
	`).Scan(&clients).Error

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve client data: %w", err)
	}

	return clients, nil
}

func (s *Service) GetRoles(userID, clientID int) ([]LookupOption, error) {
	var roles []LookupOption
	err := s.db.DB.Raw(`
		SELECT DISTINCT r.ad_role_id as id, r.name as text
		FROM ad_role r
		JOIN ad_user_roles ur ON ur.ad_role_id = r.ad_role_id
		JOIN ad_user u ON u.ad_user_id = ur.ad_user_id
		WHERE r.isactive = 'Y'
		  AND ur.isactive = 'Y'
		  AND u.isactive = 'Y'
		  AND u.ad_user_id = ?
		  AND r.ad_client_id IN (0, ?)
		ORDER BY r.name
	`, userID, clientID).Scan(&roles).Error

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve role data: %w", err)
	}

	return roles, nil
}

func (s *Service) GetOrgs(userID, roleID, clientID int) ([]LookupOption, error) {
	var orgs []LookupOption
	// Strictly filter ad_org_id > 0 because iDempiere REST API requires a real org (not wildcard 0)
	err := s.db.DB.Raw(`
		SELECT DISTINCT o.ad_org_id as id, o.name as text
		FROM ad_org o
		JOIN ad_role_orgaccess roa ON roa.ad_org_id = o.ad_org_id
		JOIN ad_user_roles ur ON ur.ad_role_id = roa.ad_role_id
		JOIN ad_user u ON u.ad_user_id = ur.ad_user_id
		WHERE o.isactive = 'Y'
		  AND roa.isactive = 'Y'
		  AND u.isactive = 'Y'
		  AND u.ad_user_id = ?
		  AND ur.ad_role_id = ?
		  AND o.ad_client_id = ?
		  AND o.ad_org_id > 0
		ORDER BY o.ad_org_id
	`, userID, roleID, clientID).Scan(&orgs).Error

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve organization data: %w", err)
	}

	// Fallback if no specific role_orgaccess rows exist for this role
	if len(orgs) == 0 {
		var fallbackOrgs []LookupOption
		_ = s.db.DB.Raw(`
			SELECT ad_org_id as id, name as text
			FROM ad_org
			WHERE isactive = 'Y' AND ad_client_id = ? AND ad_org_id > 0
			ORDER BY ad_org_id
		`, clientID).Scan(&fallbackOrgs).Error
		orgs = fallbackOrgs
	}

	return orgs, nil
}

func (s *Service) GetWarehouses(roleID, orgID int) ([]LookupOption, error) {
	var warehouses []LookupOption
	err := s.db.DB.Raw(`
		SELECT DISTINCT w.m_warehouse_id as id, w.name as text
		FROM m_warehouse w
		JOIN ad_role_orgaccess roa ON roa.ad_org_id = w.ad_org_id
		WHERE w.isactive = 'Y'
		  AND roa.isactive = 'Y'
		  AND roa.ad_role_id = ?
		  AND w.ad_org_id = ?
		ORDER BY w.m_warehouse_id
	`, roleID, orgID).Scan(&warehouses).Error

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve warehouse data: %w", err)
	}

	return warehouses, nil
}

func (s *Service) SelectContext(req SelectContextRequest) (*ContextLoginResponse, error) {
	username := strings.TrimSpace(req.Username)

	// SAFEGUARD 1: Ensure OrgID is a valid organization (> 0)
	if req.OrgID <= 0 {
		var resolvedOrgID int
		_ = s.db.DB.Raw(`
			SELECT o.ad_org_id 
			FROM ad_org o
			JOIN ad_role_orgaccess roa ON roa.ad_org_id = o.ad_org_id
			WHERE roa.ad_role_id = ? AND o.ad_org_id > 0 AND o.isactive = 'Y'
			ORDER BY o.ad_org_id
			LIMIT 1
		`, req.RoleID).Scan(&resolvedOrgID).Error

		if resolvedOrgID == 0 {
			_ = s.db.DB.Raw(`
				SELECT ad_org_id FROM ad_org 
				WHERE ad_client_id = ? AND ad_org_id > 0 AND isactive = 'Y' 
				ORDER BY ad_org_id LIMIT 1
			`, req.ClientID).Scan(&resolvedOrgID).Error
		}

		if resolvedOrgID > 0 {
			log.Printf("[SAFEGUARD] Auto-corrected orgId from %d to %d for role %d", req.OrgID, resolvedOrgID, req.RoleID)
			req.OrgID = resolvedOrgID
		}
	}

	// SAFEGUARD 2: Verify WarehouseID belongs to this role and org
	if req.WarehouseID != nil && *req.WarehouseID > 0 {
		var validCount int64
		_ = s.db.DB.Raw(`
			SELECT count(1) 
			FROM m_warehouse w
			JOIN ad_role_orgaccess roa ON roa.ad_org_id = w.ad_org_id
			WHERE roa.ad_role_id = ? AND w.ad_org_id = ? AND w.m_warehouse_id = ? AND w.isactive = 'Y'
		`, req.RoleID, req.OrgID, *req.WarehouseID).Scan(&validCount).Error

		if validCount == 0 {
			log.Printf("[SAFEGUARD] Warehouse %d not valid for role %d and org %d, omitting warehouse parameter", *req.WarehouseID, req.RoleID, req.OrgID)
			req.WarehouseID = nil
		}
	}

	rawResult, err := s.idempiereClient.LoginWithContext(
		username,
		req.Password,
		req.ClientID,
		req.RoleID,
		req.OrgID,
		req.WarehouseID,
	)
	if err != nil {
		return nil, fmt.Errorf("context authentication failed: %w", err)
	}

	token, _ := rawResult["token"].(string)

	var userID int
	if val, ok := rawResult["userId"].(float64); ok {
		userID = int(val)
	}

	displayName := username
	if val, ok := rawResult["name"].(string); ok && val != "" {
		displayName = val
	}

	userInfo := &UserInfo{
		UserID:   userID,
		Username: username,
		Name:     displayName,
	}

	return &ContextLoginResponse{
		Success:     true,
		Message:     "Context authentication successful.",
		Token:       token,
		ClientID:    req.ClientID,
		RoleID:      req.RoleID,
		OrgID:       req.OrgID,
		WarehouseID: req.WarehouseID,
		User:        userInfo,
		RawData:     rawResult,
	}, nil
}
