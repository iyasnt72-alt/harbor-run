FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY server.mjs graphics-assets.mjs ./
COPY public ./public
COPY LICENSE THIRD_PARTY.md ./
USER node
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node","server.mjs"]
