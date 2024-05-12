all: start

start: _build _run
_build:
	@docker build -f Dockerfile -t frontend .
_run:
	@mkdir -p ".tmp/certs"
	@cp conf/* .tmp/
	@if [ ! -f ".tmp/certs/frontend.crt" ]; then \
		openssl req -x509 -newkey rsa:4096 -keyout .tmp/certs/frontend.key -out .tmp/certs/frontend.crt -days 365 -nodes -subj "/CN=datahangar.io"; \
	fi
	@sed -i "s/__REST_IP__/$$(minikube kubectl -- -n datahangar-stack get service backend-service  -o jsonpath='{.spec.clusterIP}')/g" .tmp/datahangar.conf
	@sed -i "s/__TURNILO_IP__/$$(minikube kubectl -- -n datahangar-stack get service ui-turnilo-service  -o jsonpath='{.spec.clusterIP}')/g" .tmp/datahangar.conf
	@docker run -d --name frontend --network minikube -v $$(pwd)/.tmp/certs:/etc/nginx/certs -v $$(pwd)/.tmp/htpasswd:/etc/nginx/htpasswd/htpasswd -v $$(pwd)/.tmp/datahangar.conf:/etc/nginx/conf.d/default.conf -p 80:80 -p 443:443 frontend
stop:
	@docker kill frontend || true
	@docker rm frontend || true
reload: stop start
