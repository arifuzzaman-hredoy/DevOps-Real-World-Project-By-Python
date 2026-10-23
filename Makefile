.PHONY: test run down logs

test:
	npm --prefix frontend run typecheck

run:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100
