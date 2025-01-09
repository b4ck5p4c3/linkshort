test-run:
	go run . -d

drop-migrations:
	migrate -database $POSTGRESQL_URL -path migrations down
