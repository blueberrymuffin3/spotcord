FROM node:17-alpine as base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production


FROM base as build
RUN yarn install --frozen-lockfile --development
COPY tsconfig.json ./
COPY src src
RUN yarn build


FROM base as app
COPY --from=build /app/dist dist
COPY locales locales
CMD node --enable-source-maps dist
