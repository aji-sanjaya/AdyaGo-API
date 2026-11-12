package security

import (
	"bytes"
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

// Allowed MIME types and extensions for PR & PO attachments
var (
	// Whitelist of allowed extensions for document/image attachments
	allowedExtensions = map[string]string{
		".pdf":  "application/pdf",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".webp": "image/webp",
	}

	// Blacklist of dangerous extensions (defense-in-depth against scripts, web shells, and executables)
	dangerousExtensions = map[string]bool{
		".php": true, ".phtml": true, ".php3": true, ".php4": true, ".php5": true, ".phar": true,
		".exe": true, ".dll": true, ".so": true, ".bin": true, ".com": true,
		".sh": true, ".bash": true, ".zsh": true, ".bat": true, ".cmd": true, ".ps1": true,
		".py": true, ".pyc": true, ".pl": true, ".cgi": true,
		".js": true, ".mjs": true, ".ts": true, ".vbs": true,
		".jar": true, ".war": true, ".jsp": true, ".jspx": true,
		".asp": true, ".aspx": true, ".cer": true, ".csr": true,
		".html": true, ".htm": true, ".xhtml": true, ".shtml": true,
		".svg": true, ".xml": true, ".swf": true,
		".htaccess": true, ".env": true, ".config": true,
	}

	// Safe filename regex: alphanumeric, hyphen, underscore, and dot
	safeFilenameRegex = regexp.MustCompile(`[^a-zA-Z0-9._-]`)
)

// ValidateAttachment performs comprehensive security validation on an uploaded file:
// 1. Checks max file size (default 10MB if not specified).
// 2. Sanitizes filename, eliminates directory traversal (../) and null bytes (\x00).
// 3. Validates extension against strict whitelist and blocks known dangerous extensions.
// 4. Verifies Magic Bytes / file signature (prevents executable disguised as PDF/image).
func ValidateAttachment(filename string, data []byte, maxBytes int64) (sanitizedName string, detectedMime string, err error) {
	if len(data) == 0 {
		return "", "", errors.New("file is empty")
	}

	if maxBytes > 0 && int64(len(data)) > maxBytes {
		return "", "", fmt.Errorf("file size exceeds maximum allowed limit of %d MB", maxBytes/(1024*1024))
	}

	// 1. Sanitize filename & prevent path traversal
	baseName := filepath.Base(filepath.Clean(filename))
	baseName = strings.ReplaceAll(baseName, "\x00", "") // remove null bytes
	if baseName == "" || baseName == "." || baseName == "/" {
		return "", "", errors.New("invalid file name")
	}

	ext := strings.ToLower(filepath.Ext(baseName))
	if ext == "" {
		return "", "", errors.New("file must have a valid extension (.pdf, .jpg, .jpeg, .png, .webp)")
	}

	// 2. Check dangerous extension blacklist
	if dangerousExtensions[ext] {
		return "", "", fmt.Errorf("security violation: file extension '%s' is strictly prohibited", ext)
	}

	// Also check for double extensions (e.g., shell.php.jpg or evil.sh.png)
	lowerName := strings.ToLower(baseName)
	for dangExt := range dangerousExtensions {
		if strings.Contains(lowerName, dangExt+".") {
			return "", "", fmt.Errorf("security violation: double extension containing '%s' is prohibited", dangExt)
		}
	}

	// 3. Check allowed extension whitelist
	expectedMime, allowed := allowedExtensions[ext]
	if !allowed {
		return "", "", fmt.Errorf("unsupported file format '%s'. Only genuine PDF and Image files (JPG, PNG, WEBP) are allowed", ext)
	}

	// 4. Inspect Magic Bytes / Signature Verification
	matched, verifiedMime := verifyMagicBytes(ext, data)
	if !matched {
		return "", "", fmt.Errorf("security validation failed: file content does not match the '%s' signature (disguised or corrupted file)", ext)
	}

	// Clean filename characters
	nameWithoutExt := strings.TrimSuffix(baseName, filepath.Ext(baseName))
	cleanedBase := safeFilenameRegex.ReplaceAllString(nameWithoutExt, "_")
	if len(cleanedBase) > 80 {
		cleanedBase = cleanedBase[:80]
	}
	cleanFullName := cleanedBase + ext

	if verifiedMime == "" {
		verifiedMime = expectedMime
	}

	return cleanFullName, verifiedMime, nil
}

// verifyMagicBytes inspects the binary header to verify genuine file signatures.
func verifyMagicBytes(ext string, data []byte) (bool, string) {
	if len(data) < 4 {
		return false, ""
	}

	switch ext {
	case ".pdf":
		// PDF files must start with %PDF- (0x25 0x50 0x44 0x46 0x2D)
		if len(data) >= 5 && bytes.HasPrefix(data, []byte("%PDF-")) {
			return true, "application/pdf"
		}
		// In rare cases a BOM or whitespace precedes %PDF- within the first 1024 bytes
		limit := len(data)
		if limit > 1024 {
			limit = 1024
		}
		if bytes.Contains(data[:limit], []byte("%PDF-")) {
			return true, "application/pdf"
		}
		return false, ""

	case ".jpg", ".jpeg":
		// JPEG starts with FF D8 FF
		if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
			return true, "image/jpeg"
		}
		return false, ""

	case ".png":
		// PNG starts with 89 50 4E 47 0D 0A 1A 0A
		pngHeader := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
		if len(data) >= 8 && bytes.Equal(data[:8], pngHeader) {
			return true, "image/png"
		}
		return false, ""

	case ".webp":
		// WebP starts with RIFF (0x52 0x49 0x46 0x46) and bytes 8-11 are WEBP (0x57 0x45 0x42 0x50)
		if len(data) >= 12 &&
			string(data[0:4]) == "RIFF" &&
			string(data[8:12]) == "WEBP" {
			return true, "image/webp"
		}
		return false, ""
	}

	return false, ""
}
