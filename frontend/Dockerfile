FROM node:22-alpine

WORKDIR /app

# Copy package info and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose Vite port
EXPOSE 5173

# Run Vite in dev mode, accessible outside container
CMD ["npm", "run", "dev", "--", "--host"]
