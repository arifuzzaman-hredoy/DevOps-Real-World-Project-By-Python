.PHONY: test lint run down logs

test:
	pytest -q

lint:
	ruff check app tests

run:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100
