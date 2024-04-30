all: start

start: _build _run
_build:
	@docker build -f Dockerfile -t frontend .
_run:
	@docker run -d --name frontend --network minikube -p 80:80 frontend
stop:
	@docker kill frontend || true
	@docker rm frontend || true
reload: stop start
