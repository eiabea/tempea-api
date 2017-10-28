FROM node:8.8.0-slim
MAINTAINER eiabea <developer@eiabea.com>

WORKDIR /src
COPY . /src

# Default Docker environment
CMD [ "npm", "start" ]