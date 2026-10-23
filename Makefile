.PHONY: test format format-check run down logs

test:
	npm --prefix frontend run typecheck

format:
	npm --prefix frontend run format
	terraform fmt -recursive terraform

format-check:
	npm --prefix frontend run format:check
	terraform fmt -check -recursive terraform

run:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100
