package main

import (
	"fmt"
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/logto-io/go/client"
)

var baseUrl = "http://localhost:8080"

func (s *Server) AdminPage(ctx *gin.Context) {
	ctx.Data(http.StatusOK, "json", []byte("heyy"))
}

func (s *Server) SignIn(ctx *gin.Context) {
	session := sessions.Default(ctx)
	logtoClient := client.NewLogtoClient(
		s.LogtoConfig,
		&SessionStorage{session: session},
	)

	signInUri, err := logtoClient.SignIn(fmt.Sprintf("%v/auth-callback", baseUrl))
	if err != nil {
		ctx.String(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.Redirect(http.StatusTemporaryRedirect, signInUri)
}

func (s *Server) AuthCallback(ctx *gin.Context) {
	session := sessions.Default(ctx)
	logtoClient := client.NewLogtoClient(
		s.LogtoConfig,
		&SessionStorage{session: session},
	)

	err := logtoClient.HandleSignInCallback(ctx.Request)
	if err != nil {
		ctx.String(http.StatusInternalServerError, err.Error())
		return
	}

	ctx.Redirect(http.StatusTemporaryRedirect, "/admin")
}

type SessionStorage struct {
	session sessions.Session
}

func (storage *SessionStorage) GetItem(key string) string {
	value := storage.session.Get(key)
	if value == nil {
		return ""
	}
	return value.(string)
}

func (storage *SessionStorage) SetItem(key, value string) {
	storage.session.Set(key, value)
	storage.session.Save()
}
