package notification

import "time"

type NoteNotification struct {
	ADNoteID    int       `json:"ad_note_id"`
	ADUserID    int       `json:"ad_user_id"`
	Description string    `json:"description"`
	TextMsg     string    `json:"textmsg"`
	Reference   string    `json:"reference"`
	ADTableID   int       `json:"ad_table_id"`
	RecordID    int       `json:"record_id"`
	Created     time.Time `json:"created"`
	Processed   string    `json:"processed"`
}

type NotificationResponse struct {
	Total         int64              `json:"total"`
	Notifications []NoteNotification `json:"notifications"`
}

