# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js application combining GrapesJS Studio SDK with AI-powered design generation and Supabase authentication. Users can describe layouts in a chat interface, and an AI model (via OpenRouter) generates HTML through tool calls that manipulate the GrapesJS editor in real-time. Features multi-page projects with persistent storage.

## Development Commands

**Start development server:**
```bash
npm run dev
# or
pnpm dev
```
Runs on http://localhost:3000

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm start
```

**Run tests:**
```bash
npm test
```

**Docker deployment:**
```bash
docker build -t grapesjs-ai-builder .
docker run -p 3000:3000 grapesjs-ai-builder
```

## Architecture

### Component Structure (Migrated from Single Page)
The app has been refactored from a monolithic `app/page.js` into modular components:

- **`app/page.js`**: Main client component orchestrating Editor + Sidebar
- **`components/Editor.js`**: GrapesJS editor initialization and lifecycle management
- **`components/Sidebar.js`**: Chat UI, page switcher, theme editor
- **`hooks/useAI.js`**: AI integration logic (tool execution, streaming)
- **`services/`**: Backend service abstractions
- **`utils/`**: Supabase clients and AI tool definitions

### Authentication Flow
- Supabase Auth with email/password
- Login page at `/login` (app/login/page.js)
- Server Actions in `app/actions.js` handle auth operations
- Middleware (`middleware.js`) uses `utils/supabase/middleware.js` to refresh sessions
- Protected routes redirect to `/login` if unauthenticated
- Auth callback handler at `app/auth/callback/route.js` for OAuth flows

### State Management Pattern
**Page Store (In-Memory Cache + Database Sync):**
- `pagesStore`: Dictionary of `{pageId: {messages, theme, content, name}}`
- `currentPage`: Active page `{id, name}`
- Debounced auto-save to Supabase (3s delay)
- Loads all user pages on mount, creates default if empty

**Editor State:**
- `editorRef`: GrapesJS instance (persists across renders)
- `isEditorReady`: Initialization flag
- `selectedElement`: Currently selected component for context-aware AI

**Theme System:**
Each page has a theme object: `{primaryColor, secondaryColor, fontFamily, borderRadius}`
AI uses theme for consistent styling when generating components.

### GrapesJS Integration
- Loaded via CDN (unpkg) with lazy polling for `window.GrapesJsStudioSDK`
- Dark theme, web project type, self-hosted assets
- Editor content updated via `editor.setComponents(html)`
- Selection tracking via `editor.on('component:selected')`
- Layer manager shows semantic names via `data-gjs-name` attribute

### AI Integration Architecture

**Tool-Based Editing (Not Text Generation):**
The AI doesn't generate raw HTML in responses. Instead, it calls structured tools to manipulate the editor:

**Available Tools** (`utils/aiTools.js`):
1. `style_element`: Apply CSS to selected component (supports recursive for children)
2. `update_inner_content`: Replace innerHTML (text changes, inner restructure)
3. `append_component`: Add new child component
4. `generate_whole_page`: Replace entire page (for "landing page" requests)
5. `delete_component`: Remove selected component
6. `add_class`: Add CSS class
7. `insert_sibling_before`/`after`: Add sibling components
8. `search_image`: Unsplash integration (searches AND applies in one call)

**AI Request Flow:**
1. User sends message via Sidebar
2. Client calls `generateResponse()` in `useAI.js`
3. System prompt includes:
   - Selected element context (HTML, classes, ID)
   - Page theme (colors, fonts)
   - Simplified DOM tree (3 levels deep)
   - Tool selection rules
4. Request sent to `/api/chat` (proxies to OpenRouter)
5. AI responds with tool calls (e.g., `{name: "style_element", arguments: {...}}`)
6. `executeTool()` executes tool on live GrapesJS editor
7. Result displayed in chat ("Styles updated.")

**Context Management:**
- `history`: Full conversation array (`[{role, content}]`)
- System prompt regenerated per request with fresh editor state
- Tool choice: "required" (forces AI to call a tool, never freeform text)

### API Routes

**`/api/chat`** (POST):
- Proxies requests to OpenRouter
- Accepts: `{messages, model, tools, tool_choice}`
- Returns: OpenRouter response with tool calls
- Server-side API key (`OPENROUTER_API_KEY`)
- Max duration: 30s

**`/api/unsplash/search`** (POST):
- Searches Unsplash for images
- Parameters: `{query, color?, orientation?, perPage?, page?, random?}`
- Returns: `{image: {url, alt, photographer}}` or `{results: [...]}`
- Requires `UNSPLASH_ACCESS_KEY` env var

### Database Schema (Supabase)

**`pages` table:**
```sql
id: text (primary key, client-generated)
user_id: uuid (foreign key to auth.users)
name: text
content: jsonb (GrapesJS components)
html: text (rendered output)
css: text (rendered styles)
theme: jsonb {primaryColor, secondaryColor, fontFamily, borderRadius}
messages: jsonb (chat history array)
created_at, updated_at: timestamp
```

**Row Level Security:** Users can only access their own pages.

**`profiles` table:**
Auto-created on signup via trigger (`handle_new_user()`).

### Server Actions Pattern
All Supabase operations go through Next.js Server Actions (not direct client calls):

**`app/actions.js`** exports:
- `loginAction(formData)` / `signupAction(formData)`
- `savePageAction(pageId, pageData)`
- `loadPageAction(pageId)`
- `getUserPagesAction()`
- `getUserAction()`

**`services/supabaseService.js`** wraps these for cleaner imports:
```js
supabaseService.savePage(pageId, data)
supabaseService.getUserPages()
supabaseService.loadPage(pageId)
supabaseService.getUser()
```

This proxying solves Mixed Content issues (HTTP Supabase on HTTPS Next.js).

## Environment Variables

Required in `.env.local`:
```bash
# Database (not actively used, leftover from Prisma scaffolding)
DATABASE_URL="postgresql://..."

# OpenRouter AI (server-side only)
OPENROUTER_API_KEY="sk-..."

# Application
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_AI_MODEL="google/gemini-2.0-flash-exp:free"
NEXT_PUBLIC_GRAPESJS_LICENSE_KEY="your-license-key"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

**Unsplash (optional, for image search):**
```bash
UNSPLASH_ACCESS_KEY="your-access-key"
```

## Code Organization Principles

- **Minimal, clean structure**: Single responsibility per file
- **Client vs Server boundaries**: Auth/DB via Server Actions, AI/GrapesJS client-side
- **No over-abstraction**: Direct calls, no unnecessary layers
- **Inline styles**: Component-scoped `<style jsx>`
- **Tool-based AI**: AI calls functions, doesn't generate raw HTML strings
- **Semantic naming**: `data-gjs-name` on components for layer visibility

## Key Implementation Details

### Debounced Auto-Save
`savePageData()` in `app/page.js` debounces saves with a 3s timeout. Saves messages, theme, content, and rendered HTML/CSS.

### Editor Content Extraction
```js
editor.getHtml() // Clean HTML
editor.getCss()  // Compiled CSS
editor.getProjectData() // Full component tree (saved to content field)
```

### Image Search Integration
`search_image` tool calls `/api/unsplash/search` with `random: true`, applies result based on `apply_as` parameter:
- `background`: Sets CSS background-image
- `img_append`: Appends `<img>` as child
- `img_replace`: Replaces component content with `<img>`

### Theme Application
When AI creates new components, system prompt instructs it to use `theme.primaryColor`, `theme.secondaryColor`, etc. for consistency. Theme editor in Sidebar updates `pagesStore[pageId].theme`.

### Security
- DOMPurify sanitizes all HTML before injecting into GrapesJS
- RLS policies on Supabase tables
- API keys server-side only (except Supabase anon key)
- CORS headers via OpenRouter's HTTP-Referer

## Testing
Jest configured with React Testing Library. Tests in `__tests__/` directory.

## Common Patterns

**Adding a new AI tool:**
1. Define in `utils/aiTools.js` (OpenAI function schema)
2. Implement case in `hooks/useAI.js` → `executeTool()`
3. Update system prompt examples if needed

**Adding a Server Action:**
1. Export async function in `app/actions.js` with `'use server'`
2. Wrap in `services/supabaseService.js` if frequently used
3. Call from client components

**Modifying page data structure:**
Update schema in:
- Supabase table definition
- `savePageAction()` upsert payload
- Initial state in `app/page.js` → `init()`
