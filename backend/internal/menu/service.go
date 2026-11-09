package menu

import (
	"fmt"

	"factoryhub-go/internal/database"
)

type Service struct {
	db *database.DBInstance
}

func NewService(db *database.DBInstance) *Service {
	return &Service{db: db}
}

func (s *Service) GetWelcomeMenus(roleID int) ([]MenuItem, error) {
	var items []MenuItem

	query := `
		SELECT DISTINCT 
			m.adw_web_portal_menus_id as id, 
			m.name, 
			COALESCE(m.icon, 'dashboard') as icon, 
			COALESCE(
				NULLIF(m.path, ''),
				(
					SELECT l3.path 
					FROM adw_web_portal_menus sub
					JOIN adw_web_portal_menus l3 ON l3.parent_id = sub.adw_web_portal_menus_id
					WHERE sub.rootparent_id = m.adw_web_portal_menus_id 
					  AND sub.isactive = 'Y' 
					  AND l3.isactive = 'Y'
					  AND l3.path IS NOT NULL 
					  AND l3.path != ''
					ORDER BY sub.sort_order, l3.sort_order 
					LIMIT 1
				),
				''
			) as path,
			m.sort_order, 
			COALESCE(m.description, '') as description,
			(
				SELECT count(1) 
				FROM adw_web_portal_menus sub
				LEFT JOIN adw_web_portal_menus l3 ON l3.parent_id = sub.adw_web_portal_menus_id AND l3.isactive = 'Y'
				WHERE sub.rootparent_id = m.adw_web_portal_menus_id 
				  AND sub.isactive = 'Y'
			) as sub_items_count
		FROM adw_web_portal_menus m
		JOIN adw_web_portal_role_menus rm ON m.adw_web_portal_menus_id = rm.adw_web_portal_menus_id
		WHERE rm.ad_role_id = ?
		  AND m.isactive = 'Y'
		  AND rm.isactive = 'Y'
		  AND (m.parent_id IS NULL OR m.parent_id = 0)
		  AND (m.rootparent_id IS NULL OR m.rootparent_id = 0)
		ORDER BY m.sort_order
	`

	err := s.db.DB.Raw(query, roleID).Scan(&items).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch authorized menus: %w", err)
	}

	for i := range items {
		items[i].IsClickable = items[i].Path != "" || items[i].SubItemsCount > 0
	}

	return items, nil
}

type rawSidebarRow struct {
	GroupID   int    `gorm:"column:group_id"`
	GroupName string `gorm:"column:group_name"`
	ID        int    `gorm:"column:id"`
	Name      string `gorm:"column:name"`
	Path      string `gorm:"column:path"`
	Icon      string `gorm:"column:icon"`
	SortOrder int    `gorm:"column:sort_order"`
}

func (s *Service) GetSidebarMenus(roleID int, rootID int) ([]SidebarGroup, error) {
	var rows []rawSidebarRow

	query := `
		SELECT DISTINCT
			l2.adw_web_portal_menus_id as group_id,
			l2.name as group_name,
			l3.adw_web_portal_menus_id as id,
			l3.name as name,
			COALESCE(l3.path, '') as path,
			COALESCE(NULLIF(l3.icon, ''), NULLIF(l2.icon, ''), 'layout-dashboard') as icon,
			l3.sort_order
		FROM adw_web_portal_menus l2
		JOIN adw_web_portal_menus l3 ON l3.parent_id = l2.adw_web_portal_menus_id
		JOIN adw_web_portal_role_menus rm ON l3.adw_web_portal_menus_id = rm.adw_web_portal_menus_id
		WHERE l2.rootparent_id = ?
		  AND rm.ad_role_id = ?
		  AND l2.isactive = 'Y'
		  AND l3.isactive = 'Y'
		  AND rm.isactive = 'Y'
		ORDER BY l3.sort_order
	`

	err := s.db.DB.Raw(query, rootID, roleID).Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sidebar menus: %w", err)
	}

	// Group rows by GroupID
	groupMap := make(map[int]*SidebarGroup)
	var groupOrder []int

	for _, r := range rows {
		grp, exists := groupMap[r.GroupID]
		if !exists {
			grp = &SidebarGroup{
				GroupID:   r.GroupID,
				GroupName: r.GroupName,
				Items:     []SidebarItem{},
			}
			groupMap[r.GroupID] = grp
			groupOrder = append(groupOrder, r.GroupID)
		}

		grp.Items = append(grp.Items, SidebarItem{
			ID:        r.ID,
			Name:      r.Name,
			Path:      r.Path,
			Icon:      r.Icon,
			SortOrder: r.SortOrder,
		})
	}

	var result []SidebarGroup
	for _, gID := range groupOrder {
		result = append(result, *groupMap[gID])
	}

	return result, nil
}

