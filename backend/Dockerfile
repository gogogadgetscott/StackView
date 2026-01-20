FROM golang:1.21 as build
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /stackview ./cmd/server

FROM gcr.io/distroless/base-debian12
WORKDIR /
COPY --from=build /stackview /stackview
EXPOSE 8080
ENTRYPOINT ["/stackview"]
