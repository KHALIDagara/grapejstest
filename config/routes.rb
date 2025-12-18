Rails.application.routes.draw do
  # Authentication
  get "login", to: "sessions#new"
  post "login", to: "sessions#create"
  delete "logout", to: "sessions#destroy"

  get "signup", to: "registrations#new"
  post "signup", to: "registrations#create"

  # Pages (main resource)
  resources :pages do
    member do
      post :store  # GrapesJS save endpoint
      get :load    # GrapesJS load endpoint
    end

    # AI chat endpoint nested under page
    post "ai/chat", to: "ai#chat"
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  # Root route - redirect to pages
  root "pages#index"
end
