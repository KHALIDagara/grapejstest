# Use a lightweight Node.js image
FROM node:20-alpine

# Enable pnpm (since you have pnpm-lock.yaml)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set the working directory inside the container
WORKDIR /app

# Copy dependency definitions first (for better caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of your project files (index.html, etc.)
COPY . .

# Expose port 3000 to the outside world
EXPOSE 3000

# Use `npx serve` to serve the current folder on port 3000
# This works even if your package.json doesn't have a specific start script
CMD ["npx", "serve", ".", "-l", "3000"]
