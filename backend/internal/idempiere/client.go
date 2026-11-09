package idempiere

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"strings"
	"time"

	"factoryhub-go/config"
	"github.com/go-resty/resty/v2"
)

type Client struct {
	client  *resty.Client
	baseURL string
}

func NewClient(cfg *config.Config) *Client {
	r := resty.New()
	r.SetTimeout(15 * time.Second)
	// Skip SSL verification if needed (matches Http::withoutVerifying() in Laravel)
	r.SetTLSClientConfig(&tls.Config{InsecureSkipVerify: true})

	return &Client{
		client:  r,
		baseURL: cfg.IdempiereAPIBaseURL,
	}
}

type AuthRequest struct {
	UserName   string          `json:"userName"`
	Password   string          `json:"password"`
	Parameters *AuthParameters `json:"parameters,omitempty"`
}

type AuthParameters struct {
	ClientID       int    `json:"clientId"`
	RoleID         int    `json:"roleId"`
	OrganizationID int    `json:"organizationId"`
	WarehouseID    *int   `json:"warehouseId,omitempty"`
	Language       string `json:"language,omitempty"`
}

type AuthResponse struct {
	Token    string                 `json:"token"`
	UserID   int                    `json:"userId,omitempty"`
	Name     string                 `json:"name,omitempty"`
	Email    string                 `json:"email,omitempty"`
	Clients  []interface{}          `json:"clients,omitempty"`
	RawExtra map[string]interface{} `json:"-"`
}

func (c *Client) Login(username, password string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/auth/tokens", c.baseURL)

	payload := AuthRequest{
		UserName: username,
		Password: password,
	}

	var result map[string]interface{}
	resp, err := c.client.R().
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetBody(payload).
		SetResult(&result).
		Post(url)

	if err != nil {
		return nil, fmt.Errorf("iDempiere connection error: %w", err)
	}

	if resp.StatusCode() != http.StatusOK && resp.StatusCode() != http.StatusCreated {
		return nil, fmt.Errorf("iDempiere login failed with status %d: %s", resp.StatusCode(), resp.String())
	}

	return result, nil
}

func (c *Client) LoginWithContext(username, password string, clientID, roleID, orgID int, warehouseID *int) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/auth/tokens", c.baseURL)

	params := &AuthParameters{
		ClientID:       clientID,
		RoleID:         roleID,
		OrganizationID: orgID,
		Language:       "en_US",
	}

	if warehouseID != nil && *warehouseID > 0 {
		params.WarehouseID = warehouseID
	}

	payload := AuthRequest{
		UserName:   username,
		Password:   password,
		Parameters: params,
	}

	var result map[string]interface{}
	resp, err := c.client.R().
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetBody(payload).
		SetResult(&result).
		Post(url)

	if err != nil {
		return nil, fmt.Errorf("iDempiere context login error: %w", err)
	}

	if resp.StatusCode() != http.StatusOK && resp.StatusCode() != http.StatusCreated {
		return nil, fmt.Errorf("iDempiere context login failed with status %d: %s", resp.StatusCode(), resp.String())
	}

	return result, nil
}

func (c *Client) PostModel(token string, modelPath string, payload interface{}) (map[string]interface{}, error) {
	cleanPath := strings.TrimPrefix(strings.TrimPrefix(modelPath, "/"), "models/")
	cleanPath = strings.TrimPrefix(cleanPath, "/")
	url := fmt.Sprintf("%s/models/%s", c.baseURL, cleanPath)

	var result map[string]interface{}
	req := c.client.R().
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetBody(payload).
		SetResult(&result)

	if token != "" {
		req.SetHeader("Authorization", "Bearer "+token)
	}

	resp, err := req.Post(url)
	if err != nil {
		return nil, fmt.Errorf("iDempiere POST error: %w", err)
	}

	if resp.StatusCode() >= 400 {
		return nil, fmt.Errorf("iDempiere API error (%d): %s", resp.StatusCode(), resp.String())
	}

	return result, nil
}

func (c *Client) PutModel(token string, modelPath string, id int, payload interface{}) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/models/%s/%d", c.baseURL, modelPath, id)

	var result map[string]interface{}
	req := c.client.R().
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetBody(payload).
		SetResult(&result)

	if token != "" {
		req.SetHeader("Authorization", "Bearer "+token)
	}

	resp, err := req.Put(url)
	if err != nil {
		return nil, fmt.Errorf("iDempiere PUT error: %w", err)
	}

	if resp.StatusCode() >= 400 {
		return nil, fmt.Errorf("iDempiere API error (%d): %s", resp.StatusCode(), resp.String())
	}

	return result, nil
}

func (c *Client) DeleteEndpoint(token string, endpoint string) error {
	url := fmt.Sprintf("%s/%s", c.baseURL, endpoint)

	req := c.client.R().
		SetHeader("Accept", "application/json")

	if token != "" {
		req.SetHeader("Authorization", "Bearer "+token)
	}

	resp, err := req.Delete(url)
	if err != nil {
		return fmt.Errorf("iDempiere DELETE error: %w", err)
	}

	if resp.StatusCode() >= 400 {
		return fmt.Errorf("iDempiere API error (%d): %s", resp.StatusCode(), resp.String())
	}

	return nil
}

func (c *Client) DeleteModel(token string, modelPath string, id int) error {
	return c.DeleteEndpoint(token, fmt.Sprintf("models/%s/%d", modelPath, id))
}

