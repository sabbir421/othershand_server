FROM node:20-alpine AS build
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++ libc6-compat

COPY package*.json ./

RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

COPY . .

FROM node:20-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache tini \
  && addgroup -S nodeapp \
  && adduser -S nodeapp -G nodeapp

COPY --from=build --chown=nodeapp:nodeapp /usr/src/app ./

USER nodeapp

ENV TZ=Asia/Dhaka
ENV PORT=8088

EXPOSE 8088

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
