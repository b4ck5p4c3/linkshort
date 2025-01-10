package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"sync"

	"github.com/fvbock/endless"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/memstore"
	"github.com/gin-gonic/gin"
	"github.com/logto-io/go/client"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const ErrPostgerDuplicateKeyValueCode = "23505"

type Server struct {
	DB          *sql.DB
	LogtoConfig *client.LogtoConfig
}

type BackendResponse struct {
	Data  interface{} `json:"data"`
	Error string      `json:"error"`
}

func (b *Server) GetEntries(ctx *gin.Context) {
	entries := map[string]string{}
	var tempName string
	var tempUrl string

	result, err := b.DB.QueryContext(ctx, "SELECT internal_name, remote_url FROM links")
	if err != nil {
		ctx.Error(fmt.Errorf("result: %v, error: %w", result, err))
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Error: "cannot get entries from db", Data: map[string]string{}})
		return
	}

	for result.Next() {
		err = result.Scan(&tempName, &tempUrl)
		if err != nil {
			ctx.Error(fmt.Errorf("db scan error: %w", err))
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Error: "cannot parse entries from db", Data: map[string]string{}})
			return
		}
		entries[tempName] = tempUrl
	}

	ctx.IndentedJSON(http.StatusOK, BackendResponse{Error: "", Data: entries})
}

func (b *Server) AddEntry(ctx *gin.Context) {
	var newEntry map[string]string

	if err := ctx.BindJSON(&newEntry); err != nil {
		ctx.Error(err)
		ctx.AbortWithStatusJSON(http.StatusBadRequest, BackendResponse{Data: nil, Error: "parsing request data failed"})
		return
	}

	if len(newEntry) != 1 {
		ctx.Error(fmt.Errorf("payload length is not 1"))
		ctx.AbortWithStatusJSON(http.StatusBadRequest, BackendResponse{Data: nil, Error: "json must contain one element"})
		return
	}

	for key, value := range newEntry {
		result, err := b.DB.ExecContext(ctx, "INSERT INTO links (internal_name, remote_url) VALUES ($1, $2)", key, value)

		if err != nil {
			switch err := err.(type) {
			case *pgconn.PgError:
				if err.Code == ErrPostgerDuplicateKeyValueCode {
					ctx.Error(fmt.Errorf("entry with for request '%v' already exist", newEntry))
					ctx.AbortWithStatusJSON(http.StatusBadRequest, BackendResponse{Data: nil, Error: "entry with name already exist"})
					return
				}
			}

			ctx.Error(fmt.Errorf("result: %v, error: %w", result, err))
			ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Error: "cannot push entry to db", Data: nil})
			return
		}
	}

	ctx.IndentedJSON(http.StatusCreated, BackendResponse{Error: "", Data: newEntry})
}

func (b *Server) GetEntry(ctx *gin.Context) {
	name := ctx.Param("name")

	row := b.DB.QueryRowContext(ctx, "SELECT remote_url FROM links WHERE internal_name = $1", name)
	if row.Err() != nil {
		ctx.Error(fmt.Errorf("failed quering db: %w", row.Err()))
		ctx.AbortWithStatusJSON(http.StatusInternalServerError, BackendResponse{Data: nil, Error: "cannot get entry from db"})
		return
	}

	var remoteUrl string
	row.Scan(&remoteUrl)

	if remoteUrl == "" {
		ctx.Error(fmt.Errorf("requested id is not found in db"))
		ctx.AbortWithStatusJSON(http.StatusNotFound, BackendResponse{Data: nil, Error: "entry not found"})
		return
	}

	ctx.Redirect(http.StatusMovedPermanently, remoteUrl)
}

func newInstance(ctx context.Context, postgresPath string, logtoEndpoint string, logtoAppId string, logtoAppSecret string) (*Server, error) {
	db, err := sql.Open("pgx", postgresPath)
	if err != nil {
		return nil, fmt.Errorf("cannot open connect to db: %w", err)
	}

	err = db.PingContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("cannot ping db: %w", err)
	}

	logtoConfig := &client.LogtoConfig{
		Endpoint:  logtoEndpoint,
		AppId:     logtoAppId,
		AppSecret: logtoAppSecret,
	}

	return &Server{
		DB:          db,
		LogtoConfig: logtoConfig,
	}, nil
}

func (b *Server) ValidateLogtoAuth(ctx *gin.Context) {
	session := sessions.Default(ctx)
	logtoClient := client.NewLogtoClient(
		b.LogtoConfig,
		&SessionStorage{session: session},
	)

	if !logtoClient.IsAuthenticated() {
		ctx.Error(fmt.Errorf("client is not authenticated via logto"))
		ctx.AbortWithStatusJSON(http.StatusForbidden, BackendResponse{Data: nil, Error: "client is not authenticated via logto"})
		return
	}

	ctx.Next()
}

func (s *Server) StartServer(wg *sync.WaitGroup) {

	defer wg.Done()

	router := gin.Default()
	router.GET("/api/v1/:name/", s.GetEntry)

	// idk what session secret is :^(
	store := memstore.NewStore([]byte("your session secret"))
	router.Use(sessions.Sessions("logto-session", store))

	router.LoadHTMLGlob("static/*.html")
	router.Static("/assets", "static/assets")
	router.StaticFile("/oneko.gif", "static/assets/oneko.gif")
	router.GET("/", func(ctx *gin.Context) {
		ctx.HTML(http.StatusOK, "mainpage.tmpl", gin.H{"baseUrl": baseUrl})
	})

	router.GET("/sign-in", s.SignIn)
	router.GET("auth-callback", s.AuthCallback)

	requiesAuthGroup := router.Group("/")
	requiesAuthGroup.Use(s.ValidateLogtoAuth)
	requiesAuthGroup.POST("/api/v1/entries", s.AddEntry)
	requiesAuthGroup.GET("/api/v1/entries", s.GetEntries)

	requiesAuthGroup.StaticFile("/admin", "static/adminpage.html")
	requiesAuthGroup.StaticFile("/admin.js", "static/admin.js")

	endless.ListenAndServe("localhost:8080", router)
}
