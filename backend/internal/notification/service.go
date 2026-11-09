package notification

import (
	"strings"

	"factoryhub-go/internal/database"
)

type Service struct {
	db *database.DBInstance
}

func NewService(db *database.DBInstance) *Service {
	return &Service{db: db}
}

func (s *Service) ResolveUserID(username string) (int, error) {
	var userID int
	err := s.db.DB.Raw(`
		SELECT ad_user_id 
		FROM ad_user 
		WHERE isactive = 'Y' AND (LOWER(name) = ? OR LOWER(value) = ?) 
		LIMIT 1
	`, strings.ToLower(username), strings.ToLower(username)).Scan(&userID).Error
	return userID, err
}

func (s *Service) GetNotifications(clientID, userID, limit int) (*NotificationResponse, error) {
	if userID <= 0 {
		return &NotificationResponse{
			Total:         0,
			Notifications: []NoteNotification{},
		}, nil
	}

	if limit <= 0 || limit > 100 {
		limit = 30
	}

	var items []NoteNotification
	query := `
		SELECT
			n.ad_note_id,
			n.ad_user_id,
			COALESCE(n.description, '') as description,
			COALESCE(n.textmsg, '') as textmsg,
			COALESCE(n.reference, '') as reference,
			COALESCE(n.ad_table_id, 0) as ad_table_id,
			COALESCE(n.record_id, 0) as record_id,
			n.created,
			COALESCE(n.processed, 'N') as processed
		FROM ad_note n
		WHERE n.isactive = 'Y'
		  AND n.processed = 'N'
		  AND (? = 0 OR n.ad_client_id = ?)
		  AND n.ad_user_id = ?
		ORDER BY n.created DESC
		LIMIT ?
	`

	err := s.db.DB.Raw(query, clientID, clientID, userID, limit).Scan(&items).Error
	if err != nil {
		return nil, err
	}

	var total int64
	countQuery := `
		SELECT COUNT(*)
		FROM ad_note n
		WHERE n.isactive = 'Y'
		  AND n.processed = 'N'
		  AND (? = 0 OR n.ad_client_id = ?)
		  AND n.ad_user_id = ?
	`
	_ = s.db.DB.Raw(countQuery, clientID, clientID, userID).Scan(&total).Error

	return &NotificationResponse{
		Total:         total,
		Notifications: items,
	}, nil
}

