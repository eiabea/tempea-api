FROM node:8.8.0-slim
MAINTAINER eiabea <developer@eiabea.com>

ENV NODE_PATH=/root/node_modules
ARG NODE=dev
ENV NODE_ENV ${NODE}

COPY ./package.json /root/package.json
WORKDIR /root

RUN npm -q install && npm cache clean --force

WORKDIR /src
COPY . /src

# Default Docker environment
CMD [ "npm", "start" ]