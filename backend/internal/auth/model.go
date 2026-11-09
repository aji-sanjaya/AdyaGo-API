package auth

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Remember bool   `json:"remember"`
}

type SelectContextRequest struct {
	Username    string `json:"username" binding:"required"`
	Password    string `json:"password" binding:"required"`
	ClientID    int    `json:"client_id" binding:"required"`
	RoleID      int    `json:"role_id" binding:"required"`
	OrgID       int    `json:"org_id"` // 0 is wildcard '*'
	WarehouseID *int   `json:"warehouse_id"`
}

type LookupOption struct {
	ID   int    `json:"id"`
	Text string `json:"text"`
}

type UserInfo struct {
	ID       int    `json:"id"`
	UserID   int    `json:"userId"`
	Username string `json:"username"`
	Name     string `json:"name"`
	Email    string `json:"email,omitempty"`
}

type LoginInitialResponse struct {
	Success bool                   `json:"success"`
	Message string                 `json:"message"`
	Token   string                 `json:"token,omitempty"`
	User    *UserInfo              `json:"user,omitempty"`
	RawData map[string]interface{} `json:"raw_data,omitempty"`
}

type ContextLoginResponse struct {
	Success      bool                   `json:"success"`
	Message      string                 `json:"message"`
	Token        string                 `json:"token"`
	ClientID     int                    `json:"clientId"`
	RoleID       int                    `json:"roleId"`
	OrgID        int                    `json:"orgId"`
	WarehouseID  *int                   `json:"warehouseId,omitempty"`
	UserID       int                    `json:"userId"`
	User         *UserInfo              `json:"user,omitempty"`
	RawData      map[string]interface{} `json:"raw_data,omitempty"`
}

