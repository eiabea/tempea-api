FROM node:9.4.0-slim
LABEL eiabea <developer@eiabea.com>

WORKDIR /src
COPY . /src

# Default Docker environment
CMD [ "npm", "start" ]