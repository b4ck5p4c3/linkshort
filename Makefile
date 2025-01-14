test-run:
	npm --prefix static/ run build
	go run . -d

build-front:
	npm --prefix static/ run build

drop-migrations:
	migrate -database $POSTGRESQL_URL -path migrations down
