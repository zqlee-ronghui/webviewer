FROM node

MAINTAINER zqlee 'zqlee@ronghui.tech'

ENV DEBIAN_FRONTEND noninteractive

RUN mkdir -p /var/webviwer/web

ENTRYPOINT cd /var/webviwer/web && npm install && npm run serve && /bin/bash

