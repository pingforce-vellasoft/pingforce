# Stage 1: Build the Nx workspace
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies (only those needed for building)
# We copy the prisma folder early because package.json has a postinstall script that runs prisma generate
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# Copy the rest of the workspace source code
COPY . .

# Build the api application using Nx
# This will output to dist/apps/api
RUN npx nx build api --configuration=production

# Stage 2: Create the production image
FROM node:22-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files and install only production dependencies
# We use --ignore-scripts to prevent postinstall from trying to run prisma generate again
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy the generated Prisma client from the builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Copy the built API application from the builder stage
COPY --from=builder /app/dist/apps/api ./dist/apps/api

# Create a non-root user and group for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expose the API port (defaults to 3000 in NestJS)
EXPOSE 3000

# Start the application using the compiled main.js file
CMD ["node", "dist/apps/api/main.js"]
