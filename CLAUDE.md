# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that combines GrapesJS Studio SDK with AI-powered design generation. The app features a collapsible chat sidebar where users describe layouts, and an AI model (via OpenRouter) generates HTML that is dynamically injected into the GrapesJS editor.

## Development Commands

**Start development server:**
```bash
npm run dev
# or
pnpm dev
```
The app runs on http://localhost:3000

**Build for production:**
```bash
npm run build
# or
pnpm build
```

**Start production server:**
```bash
npm start
# or
pnpm start
```

**Docker deployment:**
```bash
docker build -t grapesjs-ai-builder .
docker run -p 3000:3000 grapesjs-ai-builder
```

## Architecture

### Single-Page Application Structure
- The entire application is contained in `app/page.js` as a client component (`'use client'`)
- Uses Next.js App Router with a single root page
- No separate components or pages directory currently

### Key Technical Stack
- **Next.js** (latest): React framework with App Router
- **GrapesJS Studio SDK**: Loaded via CDN (unpkg) with lazy loading
- **OpenRouter API**: AI completions via streaming API (uses model specified in env)
- **Client-side only**: All logic runs in browser, including API calls to OpenRouter

### State Management Pattern
The app uses React hooks for all state:
- `editorRef`: Holds GrapesJS editor instance
- `isEditorReady`: Tracks editor initialization
- `isSidebarCollapsed`: Sidebar UI state
- `messages`: Chat history (array of `{role, text}`)
- `input`: Current user input
- `isThinking`: AI processing indicator
- `historyRef`: Conversation context for AI (not rendered)

### GrapesJS Integration
- Waits for `window.GrapesJsStudioSDK` to be available via polling
- Creates editor with dark theme, web project type, and self-hosted assets
- Updates editor content via `editor.setComponents(html)` when AI responds
- Editor instance stored in ref to persist across renders

### AI Integration Flow
1. User sends message via chat interface
2. System prompt instructs AI to output clean HTML (no markdown, no wrapper tags)
3. Streaming response from OpenRouter API
4. Real-time text accumulation displayed in chat
5. Final HTML cleaned (strips markdown code fences) and injected into GrapesJS
6. Conversation history maintained for context

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_OPENROUTER_API_KEY`: OpenRouter API key
- `NEXT_PUBLIC_SITE_URL`: Your site URL (for OpenRouter HTTP-Referer)
- `NEXT_PUBLIC_AI_MODEL`: AI model name (e.g., "google/gemini-flash-2.0")
- `NEXT_PUBLIC_GRAPESJS_LICENSE_KEY`: GrapesJS Studio license key

Note: `DATABASE_URL` in `.env` is from Prisma scaffolding but not currently used.

## Code Organization Principles

- **Inline styles**: All CSS is in `<style jsx global>` within page.js
- **Single responsibility**: Each function handles one clear task
- **Minimal dependencies**: Only core Next.js and SDK packages
- **No over-engineering**: Direct API calls, no abstraction layers

## Working with This Codebase

- The app uses environment variables for all configuration (see CONFIG object)
- GrapesJS is loaded from CDN, not bundled
- All UI (sidebar, editor, chat) is in a single flexbox layout
- Streaming is handled manually via ReadableStream API
- No TypeScript, no linting config currently
