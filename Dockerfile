FROM nginx:stable

COPY src/ /usr/share/nginx/html/datahangar
COPY conf/datahangar.conf /etc/nginx/conf.d/default.conf
RUN chown nginx:nginx /usr/share/nginx/html/datahangar -R
