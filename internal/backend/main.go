package backend

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/fvbock/endless"
	"github.com/gin-gonic/gin"
	"github.com/lestrrat-go/jwx/jwk"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const ErrPostgerDuplicateKeyValueCode = "23505"

type Backend struct {
	DB     *sql.DB
	JWKSet *jwk.Set
}

type BackendResponse struct {
	Data  interface{} `json:"data" example:"puk"`
	Error string      `json:"error"`
}

func (b *Backend) GetEntries(ctx *gin.Context) {
	entries := map[string]string{}
	var tempName string
	var tempUrl string

	result, err := b.DB.QueryContext(ctx, "SELECT internal_name, remote_url FROM links")
	if err != nil {
		ctx.Error(fmt.Errorf("result: %v, error: %w", result, err))
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Error: "cannot get entries from db", Data: map[string]string{}})
	}

	for result.Next() {
		err = result.Scan(&tempName, &tempUrl)
		if err != nil {
			ctx.Error(fmt.Errorf("db scan error: %w", err))
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Error: "cannot parse entries from db", Data: map[string]string{}})
		}
		entries[tempName] = tempUrl
	}

	ctx.IndentedJSON(http.StatusOK, BackendResponse{Error: "", Data: entries})
}

func (b *Backend) AddEntry(ctx *gin.Context) {
	var newEntry map[string]string

	if err := ctx.BindJSON(&newEntry); err != nil {
		ctx.Error(err)
		ctx.AbortWithStatusJSON(http.StatusBadRequest, BackendResponse{Data: nil, Error: "parsing request data failed"})
	}

	if len(newEntry) != 1 {
		ctx.Error(fmt.Errorf("payload length is not 1"))
		ctx.AbortWithStatusJSON(http.StatusBadRequest, BackendResponse{Data: nil, Error: "json must contain one element"})
	}

	for key, value := range newEntry {
		result, err := b.DB.ExecContext(ctx, "INSERT INTO links (internal_name, remote_url) VALUES ($1, $2)", key, value)

		if err != nil {
			switch err := err.(type) {
			case *pgconn.PgError:
				if err.Code == ErrPostgerDuplicateKeyValueCode {
					ctx.Error(fmt.Errorf("entry with for request '%v' already exist", newEntry))
					ctx.AbortWithStatusJSON(http.StatusBadRequest, BackendResponse{Data: nil, Error: "entry with name already exist"})
				}
			}

			ctx.Error(fmt.Errorf("result: %v, error: %w", result, err))
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Error: "cannot push entry to db", Data: nil})
		}
	}

	ctx.IndentedJSON(http.StatusCreated, BackendResponse{Error: "", Data: newEntry})
}

func (b *Backend) GetEntry(ctx *gin.Context) {
	name := ctx.Param("name")

	row := b.DB.QueryRowContext(ctx, "SELECT remote_url FROM links WHERE internal_name = $1", name)
	if row.Err() != nil {
		ctx.Error(fmt.Errorf("failed quering db: %w", row.Err()))
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Data: nil, Error: "cannot get entry from db"})
	}

	var remoteUrl string
	row.Scan(&remoteUrl)

	if remoteUrl == "" {
		ctx.Error(fmt.Errorf("requested id is not found in db"))
		ctx.AbortWithStatusJSON(http.StatusNotFound, BackendResponse{Data: nil, Error: "entry not found"})
	}

	ctx.Redirect(http.StatusMovedPermanently, remoteUrl)
}

func NewBackend(ctx context.Context, postgresPath string, JWKUrl string, timeToRefreshJWK time.Duration) (*Backend, error) {
	db, err := sql.Open("pgx", postgresPath)
	if err != nil {
		return nil, fmt.Errorf("cannot open connect to db: %w", err)
	}

	err = db.PingContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("cannot ping db: %w", err)
	}

	autoRefreshJWK := jwk.NewAutoRefresh(ctx)
	autoRefreshJWK.Configure(JWKUrl, jwk.WithMinRefreshInterval(timeToRefreshJWK))

	jwkSet, err := autoRefreshJWK.Refresh(ctx, JWKUrl)
	if err != nil {
		return nil, fmt.Errorf("cannot refresh jwk url: %w", err)
	}

	return &Backend{
		DB:     db,
		JWKSet: &jwkSet,
	}, nil
}

func ValidateJWT(ctx *gin.Context) {
	authHeader := ctx.Request.Header.Get("Authorization")
	if authHeader == "" {
		ctx.Error(fmt.Errorf("authorization header is empty"))
		ctx.AbortWithStatusJSON(http.StatusForbidden, BackendResponse{Data: nil, Error: "Authorization header is empty"})
	}

	ctx.Next()
}

func (b *Backend) StartServer(wg *sync.WaitGroup) {
	defer wg.Done()

	router := gin.Default()
	router.GET("/api/v1/entries", b.GetEntries)
	router.GET("/api/v1/:name/", b.GetEntry)

	requiesAuthGroup := router.Group("/api/v1/entries")
	requiesAuthGroup.Use(ValidateJWT)
	requiesAuthGroup.POST("/api/v1/entries", b.AddEntry)

	endless.ListenAndServe("localhost:8080", router)
}
