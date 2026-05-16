FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install only production dependencies first to save space
RUN npm install

COPY . .

# Set environment variables
ENV NODE_OPTIONS=--max-old-space-size=450
ENV NODE_ENV=production

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
