package menu

type MenuItem struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Icon          string `json:"icon,omitempty"`
	Path          string `json:"path,omitempty"`
	SortOrder     int    `json:"sort_order"`
	Description   string `json:"description,omitempty"`
	SubItemsCount int    `json:"sub_items_count"`
	IsClickable   bool   `json:"is_clickable"`
}

type SidebarItem struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	Icon      string `json:"icon,omitempty"`
	SortOrder int    `json:"sort_order"`
}

type SidebarGroup struct {
	GroupID   int           `json:"group_id"`
	GroupName string        `json:"group_name"`
	Items     []SidebarItem `json:"items"`
}

