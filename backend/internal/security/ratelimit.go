package security

import (
	"sync"
	"time"
)

type AttemptRecord struct {
	Count     int
	FirstFail time.Time
	LockedUntil time.Time
}

type RateLimiter struct {
	mu              sync.RWMutex
	attempts        map[string]*AttemptRecord
	maxAttempts     int
	lockoutDuration time.Duration
	windowDuration  time.Duration
}

func NewRateLimiter(maxAttempts int, lockoutDuration time.Duration) *RateLimiter {
	limiter := &RateLimiter{
		attempts:        make(map[string]*AttemptRecord),
		maxAttempts:     maxAttempts,
		lockoutDuration: lockoutDuration,
		windowDuration:  10 * time.Minute,
	}

	// Periodic cleanup goroutine to prevent memory growth
	go limiter.cleanupLoop()

	return limiter
}

// IsLocked checks if a key is currently locked out.
func (r *RateLimiter) IsLocked(key string) (bool, int) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rec, exists := r.attempts[key]
	if !exists {
		return false, 0
	}

	now := time.Now()
	if now.Before(rec.LockedUntil) {
		remaining := int(time.Until(rec.LockedUntil).Seconds()) + 1
		return true, remaining
	}

	return false, 0
}

// RecordFailure records a failed login attempt.
// Returns: isLocked, remainingAttempts, retryAfterSeconds
func (r *RateLimiter) RecordFailure(key string) (bool, int, int) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	rec, exists := r.attempts[key]

	if !exists {
		r.attempts[key] = &AttemptRecord{
			Count:     1,
			FirstFail: now,
		}
		return false, r.maxAttempts - 1, 0
	}

	// If lockout expired, reset counter
	if !rec.LockedUntil.IsZero() && now.After(rec.LockedUntil) {
		rec.Count = 1
		rec.FirstFail = now
		rec.LockedUntil = time.Time{}
		return false, r.maxAttempts - 1, 0
	}

	// If window expired without lockout, reset
	if now.Sub(rec.FirstFail) > r.windowDuration {
		rec.Count = 1
		rec.FirstFail = now
		rec.LockedUntil = time.Time{}
		return false, r.maxAttempts - 1, 0
	}

	rec.Count++

	if rec.Count >= r.maxAttempts {
		rec.LockedUntil = now.Add(r.lockoutDuration)
		remaining := int(r.lockoutDuration.Seconds())
		return true, 0, remaining
	}

	remainingAttempts := r.maxAttempts - rec.Count
	return false, remainingAttempts, 0
}

// RecordSuccess clears the attempt counter for a key upon successful authentication.
func (r *RateLimiter) RecordSuccess(key string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.attempts, key)
}

func (r *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		r.mu.Lock()
		now := time.Now()
		for key, rec := range r.attempts {
			// Remove if lockout expired and last attempt was older than window
			if now.After(rec.LockedUntil) && now.Sub(rec.FirstFail) > r.windowDuration {
				delete(r.attempts, key)
			}
		}
		r.mu.Unlock()
	}
}

