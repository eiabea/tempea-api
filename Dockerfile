FROM balenalib/rpi-node:9.11.2-stretch
LABEL eiabea <developer@eiabea.com>

ENV NODE_PATH=/root/node_modules
ARG NODE_ENV=dev
ENV NODE_ENV ${NODE_ENV}

# Using slim image and installing these dependencies manually results in a smaller image
RUN apt-get update -q && apt-get install --no-install-recommends -q -y \
    python \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY ./package.json /root/package.json
WORKDIR /root
RUN npm -q install && npm cache clean --force

WORKDIR /src
COPY . /src

# Default Docker environment
CMD [ "npm", "start" ]
