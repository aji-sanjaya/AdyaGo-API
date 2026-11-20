package ai

import (
	"encoding/json"
	"fmt"
)

const systemPrompt = `Kamu adalah AdyaGo AI, asisten kecerdasan buatan resmi dari platform AdyaGo.

Tentang AdyaGo:
- AdyaGo adalah Adyawinsa Integrated Enterprise Platform — platform ERP terintegrasi milik Adyawinsa Group
- Tagline: "One Group. One Go."
- AdyaGo menghubungkan proses bisnis seluruh entitas di Adyawinsa Group untuk operasi yang lebih efisien, terkontrol, dan siap bertumbuh secara berkelanjutan
- Modul yang tersedia: Finance, Procurement, Manufacturing, Warehouse, Human Capital, Reporting & Insight
- Nilai utama: Integrated (lintas perusahaan dalam satu ekosistem), Efficient (proses lebih cepat dan minim duplikasi), Controlled (data akurat dan transparan), Scalable (siap mendukung pertumbuhan bisnis Grup)

Tentang dirimu:
- Nama: AdyaGo AI
- Dibuat oleh: Tim IT Adyawinsa Group
- Tujuan: Membantu pengguna mengakses dan memahami data ERP iDempiere secara cepat dan mudah melalui percakapan natural
- Kemampuan: Mengambil data Purchase Order, Purchase Requisition, vendor, produk, dan data ERP lainnya langsung dari database iDempiere

Panduan menjawab:
- Selalu perkenalkan diri sebagai "AdyaGo AI" jika ditanya siapa kamu
- Jawab dalam Bahasa Indonesia yang sopan dan profesional
- Gunakan tools yang tersedia untuk mengambil data dari database iDempiere
- Sajikan data secara ringkas, terstruktur, dan mudah dipahami
- Jika data tidak ditemukan, sampaikan dengan sopan dan tawarkan alternatif pencarian
- Jangan menjawab pertanyaan di luar konteks ERP dan data perusahaan Adyawinsa Group`

type Service struct {
	client   *OllamaClient
	registry *ToolRegistry
}

func NewService(client *OllamaClient, registry *ToolRegistry) *Service {
	return &Service{client: client, registry: registry}
}

func (s *Service) Chat(history []Message, userMessage string) (string, error) {
	messages := []Message{
		{Role: "system", Content: systemPrompt},
	}
	messages = append(messages, history...)
	messages = append(messages, Message{Role: "user", Content: userMessage})

	tools := s.registry.GetTools()

	// Agentic loop — max 5 iterasi untuk hindari infinite loop
	for i := 0; i < 5; i++ {
		resp, err := s.client.Chat(messages, tools)
		if err != nil {
			return "", fmt.Errorf("chat error: %w", err)
		}

		messages = append(messages, resp.Message)

		// Tidak ada tool call — jawaban final
		if len(resp.Message.ToolCalls) == 0 {
			return resp.Message.Content, nil
		}

		// Eksekusi setiap tool call yang diminta model
		for _, tc := range resp.Message.ToolCalls {
			result, err := s.registry.Execute(tc.Function.Name, tc.Function.Arguments)
			if err != nil {
				result = fmt.Sprintf(`{"error": "%s"}`, err.Error())
			}

			messages = append(messages, Message{
				Role:       "tool",
				Content:    result,
				ToolCallID: tc.ID,
			})
		}
	}

	return "", fmt.Errorf("max tool call iterations reached")
}

type ChatHistoryItem struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func ConvertHistory(items []ChatHistoryItem) []Message {
	msgs := make([]Message, 0, len(items))
	for _, item := range items {
		if item.Role == "user" || item.Role == "assistant" {
			msgs = append(msgs, Message{Role: item.Role, Content: item.Content})
		}
	}
	return msgs
}

func MarshalArgs(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}
