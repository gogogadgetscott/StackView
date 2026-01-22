FROM golang:1.24 as build
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -o /stackview ./cmd/server

FROM debian:bookworm-slim
WORKDIR /
RUN apt-get update && apt-get install -y ca-certificates libsqlite3-0 && rm -rf /var/lib/apt/lists/*
COPY --from=build /stackview /stackview
EXPOSE 8080
ENTRYPOINT ["/stackview"]
