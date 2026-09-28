.PHONY: setup db migrate seed ingest test dev

export DATABASE_URL ?= postgres://zone:zone@localhost:5434/zone
VENV := .venv
PY := $(VENV)/bin/python

setup:
	npm install
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -r python/requirements.txt

db:
	docker compose up -d db
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
	  docker compose exec -T db pg_isready -U zone -d zone && exit 0; \
	  sleep 2; \
	done; \
	exit 1

migrate:
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f db/migrations/001_init.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f db/migrations/002_fuzzy_address.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f db/migrations/003_parcel_enrichment.sql
	psql "$(DATABASE_URL)" -v ON_ERROR_STOP=1 -f db/migrations/004_zoning_enrichment.sql

austin-zoning:
	PYTHONPATH=python $(PY) -m ingestion.cli austin-zoning

austin-zoning-link:
	PYTHONPATH=python $(PY) -m ingestion.cli austin-zoning-link

seed:
	PYTHONPATH=python $(PY) -m ingestion.cli counties
	PYTHONPATH=python $(PY) -m ingestion.cli ingest --fixture python/ingestion/fixtures/travis_sample.geojson

ingest:
	PYTHONPATH=python $(PY) -m ingestion.cli ingest --fips 48453

test:
	npm test
	PYTHONPATH=python $(PY) -m pytest python/tests

dev:
	npm run dev
