FROM node:20-alpine
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN yarn install --non-interactive --frozen-lockfile
COPY $PWD/docker/entrypoint.sh /usr/local/bin
ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]