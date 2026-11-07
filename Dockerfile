# One image that serves both the API and the built React app.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm install --omit=dev -w server --include-workspace-root=false
COPY server ./server
COPY --from=build /app/client/dist ./client/dist
EXPOSE 4000
USER node
# Run `npm run db:setup` once against your production database before first start.
CMD ["node", "server/src/index.js"]
