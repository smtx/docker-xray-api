FROM node:latest
MAINTAINER @smtx

RUN apt-get update -qq && apt-get upgrade -y && apt-get install -y \
    git \
    build-essential \
    g++ \
    flex \
    bison \
    gperf \
    ruby \
    perl \
    libsqlite3-dev \
    libfontconfig1-dev \
    libicu-dev \
    libfreetype6 \
    libssl-dev \
    libpng-dev \
    libjpeg-dev \
    libqt5webkit5-dev

RUN git clone https://github.com/ariya/phantomjs.git /tmp/phantomjs && \
  cd /tmp/phantomjs && \
  ./build.sh --confirm && mv bin/phantomjs /usr/local/bin && \
  rm -rf /tmp/phantomjs

WORKDIR /home/api
ADD . /home/api

RUN npm install

EXPOSE 8888

CMD node index.js
