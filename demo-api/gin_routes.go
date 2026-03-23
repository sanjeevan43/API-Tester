package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func main() {
    r := gin.Default()

    // Gin specific group and methods
    api := r.Group("/api/v1")
    {
        api.GET("/ping", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{"message": "pong"})
        })

        // Path parameter
        api.GET("/posts/:id", func(c *gin.Context) {
            id := c.Param("id")
            c.JSON(http.StatusOK, gin.H{"post_id": id})
        })

        // Auth detection pattern
        api.POST("/posts", func(c *gin.Context) {
            // jwt.verify pattern detection
            var json struct {
                Title   string `json:"title"`
                Content string `json:"content"`
            }
            c.JSON(http.StatusCreated, json)
        })
    }

    r.Run()
}
