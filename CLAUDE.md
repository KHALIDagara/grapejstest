# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Ruby on Rails application combining GrapesJS editor with AI-powered design generation. Users can create and edit pages using the GrapesJS visual editor, with an AI assistant that can modify components based on natural language instructions. Features page management, theme customization, and persistent storage with SQLite.

## Development Commands

**Start development server:**
```bash
bin/rails server
# or
bin/dev
```
Runs on http://localhost:3000

**Run database migrations:**
```bash
bin/rails db:migrate
```

**Reset database:**
```bash
bin/rails db:reset
```

**Rails console:**
```bash
bin/rails console
```

**Run tests:**
```bash
bin/rails test
```

## Architecture

### Rails Conventions
This project follows standard Rails conventions:
- **MVC Architecture**: Models, Views, Controllers separation
- **RESTful Routes**: Standard resource-based routing
- **Stimulus/Hotwire**: Minimal JavaScript with Stimulus controllers
- **DRY Principle**: Shared logic in concerns and helpers

### Models

**User** (`app/models/user.rb`):
- Authentication via `has_secure_password` (bcrypt)
- Has many pages (dependent destroy)
- Email validation and normalization

**Page** (`app/models/page.rb`):
- Belongs to user
- Stores GrapesJS content as JSON
- Theme settings (primaryColor, secondaryColor, fontFamily, borderRadius)
- Chat messages history as JSON array
- HTML/CSS extracted on save

### Controllers

**ApplicationController** (`app/controllers/application_controller.rb`):
- `current_user` helper method
- `authenticate_user!` before action
- Session-based authentication

**SessionsController** (`app/controllers/sessions_controller.rb`):
- Login/logout functionality
- Session management

**RegistrationsController** (`app/controllers/registrations_controller.rb`):
- User signup

**PagesController** (`app/controllers/pages_controller.rb`):
- CRUD operations for pages
- `store` action: GrapesJS remote storage save endpoint
- `load` action: GrapesJS remote storage load endpoint
- JSON and Turbo Stream responses

**AiController** (`app/controllers/ai_controller.rb`):
- `chat` action: Processes AI requests via OpenRouter
- Builds context from page attributes and selected element
- Returns tool calls for GrapesJS manipulation

### Views

**Layouts** (`app/views/layouts/application.html.erb`):
- Tailwind CSS styling
- Flash message display
- Stimulus/Turbo integration

**Pages** (`app/views/pages/`):
- `index.html.erb` / `show.html.erb`: Main editor view with GrapesJS
- Sidebar with tabs: Chat, Pages, Theme

**Sessions/Registrations**:
- Login and signup forms

### Stimulus Controllers

**editor_controller.js**:
- Initializes GrapesJS with remote storage
- Handles page CRUD operations
- Executes AI tool calls on editor
- Theme management

**chat_controller.js**:
- Sends messages to AI endpoint
- Displays chat history
- Executes tool calls from AI responses
- Tracks selected element context

**sidebar_controller.js**:
- Tab switching logic

**flash_controller.js**:
- Auto-dismiss flash messages

### GrapesJS Integration

**Remote Storage Configuration:**
```javascript
storageManager: {
  type: 'remote',
  options: {
    remote: {
      urlStore: '/pages/:id/store',
      urlLoad: '/pages/:id/load',
      headers: { 'X-CSRF-Token': csrfToken }
    }
  }
}
```

**Key GrapesJS API Methods Used:**
- `editor.getHtml()` / `editor.getCss()`: Extract rendered output
- `editor.getProjectData()` / `editor.loadProjectData()`: Full project serialization
- `editor.getSelected()`: Currently selected component
- `editor.setComponents()` / `editor.setStyle()`: Replace content
- `component.addStyle()`: Apply CSS styles
- `component.append()`: Add child components
- `editor.Pages.getAll()`: Multi-page support

### AI Tool System

The AI assistant uses function calling to manipulate the editor:

1. **style_element**: Apply CSS styles to selected component
2. **update_inner_content**: Replace innerHTML
3. **append_component**: Add child element
4. **generate_whole_page**: Replace entire page
5. **delete_component**: Remove element
6. **add_class**: Add CSS class
7. **insert_sibling_before/after**: Add sibling elements

### Database Schema (SQLite)

```ruby
# Users
create_table :users do |t|
  t.string :email, null: false
  t.string :password_digest, null: false
  t.timestamps
end
add_index :users, :email, unique: true

# Pages
create_table :pages do |t|
  t.references :user, null: false, foreign_key: true
  t.string :name, null: false, default: "Untitled Page"
  t.json :content, default: {}
  t.text :html
  t.text :css
  t.json :theme, default: {}
  t.json :messages, default: []
  t.timestamps
end
add_index :pages, [:user_id, :updated_at]
```

## Environment Variables

Create a `.env` file or set in production:

```bash
# AI API (required for chat)
OPENROUTER_API_KEY="sk-..."
AI_MODEL="google/gemini-2.0-flash-exp:free"

# Application
SITE_URL="http://localhost:3000"
SECRET_KEY_BASE="your-secret-key"
```

## Routes

```ruby
# Authentication
get/post "login"   -> sessions#new/create
delete "logout"    -> sessions#destroy
get/post "signup"  -> registrations#new/create

# Pages
resources :pages do
  member do
    post :store    # GrapesJS save
    get :load      # GrapesJS load
  end
  post "ai/chat"   # AI endpoint
end

root "pages#index"
```

## Key Implementation Details

### Page Context for AI
When the AI receives a request, it gets:
- Page ID, name, theme settings
- Currently selected element (tagName, id, classes, HTML preview)
- Simplified DOM tree (3 levels deep)
- Conversation history (last 10 messages)

### Theme System
Each page has customizable theme values:
- `primaryColor`: Main accent color
- `secondaryColor`: Secondary/background color
- `fontFamily`: Typography
- `borderRadius`: Corner rounding

AI is instructed to use these values for consistency.

### Storage Flow
1. GrapesJS autosaves after N changes
2. `store` action receives full project data + extracted HTML/CSS
3. Data saved to `pages.content` (JSON), `pages.html`, `pages.css`
4. On load, `load` action returns `pages.content`

### Authentication Flow
1. User visits any page
2. `authenticate_user!` checks session
3. Redirects to `/login` if not authenticated
4. After login, session[:user_id] set
5. `current_user` loads User from session

## Code Organization Principles

- **Follow Rails conventions**: RESTful routes, MVC structure
- **Minimize JavaScript**: Use Stimulus only when necessary
- **Use GrapesJS API**: Leverage built-in functionality
- **DRY**: Extract shared logic to concerns/helpers
- **Separation of concerns**: Keep controllers thin, models handle business logic

## Common Patterns

**Adding a new AI tool:**
1. Add tool definition in `AiController#ai_tools`
2. Add execution case in `editor_controller.js#executeToolCall`
3. Update system prompt if needed

**Adding page attributes:**
1. Add migration for new column
2. Update `Page#attributes_for_context`
3. Update AI system prompt to use attribute
4. Add UI control in theme tab if needed

**Modifying storage behavior:**
1. Update `PagesController#store` for save logic
2. Update `PagesController#load` for load logic
3. Modify `editor_controller.js` storage config if needed
