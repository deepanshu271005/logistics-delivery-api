FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Copy the rest of the application
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
