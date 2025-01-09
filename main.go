package main

import (
	"context"
	"errors"
	"fmt"
	backend "linkshort/internal/backend"
	"os"
	"sync"
	"time"

	"github.com/golang-migrate/migrate"
	_ "github.com/golang-migrate/migrate/database/postgres"
	_ "github.com/golang-migrate/migrate/source/file"
	flag "github.com/spf13/pflag"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	logLevel     zapcore.Level
	postgresPath string
)

var migrationsPath = "migrations/"

var (
	backendJWKSUrl          = "https://id.bksp.in/oidc/jwks"
	backendTimeToRefreshJWK = time.Minute * 5
)

func main() {
	// init logger with needed loglevel
	loggerConfig := zap.NewProductionConfig()
	loggerConfig.Level.SetLevel(logLevel)
	unsugLogger := zap.Must(loggerConfig.Build())
	logger := unsugLogger.Sugar()
	defer logger.Sync()

	ctx := context.Background()
	defer ctx.Done()

	logger.Debugln("applying db migrations...")
	if err := applyMigrations(logger, migrationsPath, postgresPath); err != nil {
		logger.Fatal(err)
	}
	logger.Debugln("applied db migration successfully")

	logger.Debug("initializing backend..")
	back, err := backend.NewBackend(ctx, postgresPath, backendJWKSUrl, backendTimeToRefreshJWK)
	if err != nil {
		logger.Fatal(err)
	}
	logger.Debugf("initialized backend successfully")

	var wg sync.WaitGroup
	wg.Add(1)

	logger.Debug("starting web server for backend...")
	go back.StartServer(&wg)

	wg.Wait()
}

func applyMigrations(logger *zap.SugaredLogger, migrationsPath string, DBPath string) error {
	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationsPath),
		DBPath)

	if err != nil {
		return fmt.Errorf("cannot init migration: %w", err)
	}

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			logger.Debug("no changes from previous migration")
		} else {
			return fmt.Errorf("cannot apply migration: %w", err)
		}
	}

	return nil
}

func init() {
	isDebug := flag.BoolP("debug", "d", false, "enable debug logging")
	flag.Parse()

	if *isDebug {
		logLevel = zap.DebugLevel
	} else {
		logLevel = zap.InfoLevel
	}

	postgresPath = os.Getenv("POSTGRESQL_URL")
	if postgresPath == "" {
		fmt.Println("env POSTGRESQL_URL is empty")
		os.Exit(1)
	}
}
