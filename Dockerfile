FROM node:12.16.2-buster-slim

EXPOSE 80
EXPOSE 443

RUN apt-get update && apt-get -y install git libnss3-tools

RUN git clone https://github.com/alfonsomunozpomer/site.js.git
WORKDIR /site.js
RUN git checkout docker
RUN npm install && npm install nexe@3.3.7 --save-dev
RUN npm run build && cp dist/release/linux/`ls -1t dist/release/linux | head -1`/site /usr/local/bin

VOLUME /site.js/dist
VOLUME /var/www/html

ENTRYPOINT ["site"]
CMD ["serve", "/var/www/html", "--docker"]
