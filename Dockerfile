FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

# Copy dependency files first for layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p auth logs

# Expose the API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the server
CMD ["node", "src/index.js"]
