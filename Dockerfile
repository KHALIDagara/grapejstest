FROM node:20-alpine

# 1. Setup
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. Dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# 3. Copy Source Code
COPY . .

# --- CRITICAL FIX START ---
# We tell Docker to accept these arguments during the build
ARG NEXT_PUBLIC_OPENROUTER_API_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_AI_MODEL
ARG NEXT_PUBLIC_GRAPESJS_LICENSE_KEY
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG OPENROUTER_API_KEY

# We write them to a .env.production file inside the container before building
# This ensures Next.js "sees" them during the build process
RUN echo "NEXT_PUBLIC_OPENROUTER_API_KEY=$NEXT_PUBLIC_OPENROUTER_API_KEY" >> .env.production
RUN echo "SUPABASE_URL=$SUPABASE_URL" >> .env.production
RUN echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env.production
RUN echo "NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL" >> .env.production
RUN echo "NEXT_PUBLIC_AI_MODEL=$NEXT_PUBLIC_AI_MODEL" >> .env.production
RUN echo "NEXT_PUBLIC_GRAPESJS_LICENSE_KEY=$NEXT_PUBLIC_GRAPESJS_LICENSE_KEY" >> .env.production
RUN echo "OPENROUTER_API_KEY=$OPENROUTER_API_KEY" >> .env.production
# --- CRITICAL FIX END ---

# 4. Build
RUN pnpm run build

# 5. Run
EXPOSE 3000
CMD ["pnpm", "start"]
