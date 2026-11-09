package database

import (
	"log"
	"time"

	"factoryhub-go/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DBInstance struct {
	DB *gorm.DB
}

func ConnectPostgres(cfg *config.Config) (*DBInstance, error) {
	dsn := cfg.GetDSN()

	gormLogger := logger.Default.LogMode(logger.Warn)
	if cfg.GinMode == "debug" {
		gormLogger = logger.Default.LogMode(logger.Info)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Connection pool tuning
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("Connected to iDempiere PostgreSQL successfully")
	return &DBInstance{DB: db}, nil
}

