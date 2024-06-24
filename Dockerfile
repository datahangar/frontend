FROM nginx:stable

COPY src/ /usr/share/nginx/html/datahangar
COPY conf/datahangar.conf /etc/nginx/conf.d/default.conf

RUN apt-get update && apt-get install -y wget &&  apt-get -y clean && \
  rm -rf /var/lib/apt/lists/*
RUN chown nginx:nginx /usr/share/nginx/html/datahangar -R
