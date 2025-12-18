class Page < ApplicationRecord
  belongs_to :user

  validates :name, presence: true

  # Default theme values
  DEFAULT_THEME = {
    "primaryColor" => "#3b82f6",
    "secondaryColor" => "#1e293b",
    "fontFamily" => "Inter, sans-serif",
    "borderRadius" => "8px"
  }.freeze

  # Ensure content, theme, and messages are always hashes/arrays
  attribute :content, :json, default: -> { {} }
  attribute :theme, :json, default: -> { DEFAULT_THEME.dup }
  attribute :messages, :json, default: -> { [] }

  before_validation :set_defaults, on: :create

  # Return the theme with defaults merged
  def theme_with_defaults
    DEFAULT_THEME.merge(theme || {})
  end

  # Get page attributes as key-value pairs for AI context
  def attributes_for_context
    {
      id: id,
      name: name,
      theme: theme_with_defaults,
      has_content: content.present? && content.any?
    }
  end

  # Store GrapesJS project data
  def store_project_data(project_data)
    self.content = project_data
    # Extract HTML/CSS if provided
    if project_data.is_a?(Hash)
      self.html = project_data["html"] if project_data["html"]
      self.css = project_data["css"] if project_data["css"]
    end
  end

  private

  def set_defaults
    self.name ||= "Untitled Page"
    self.theme ||= DEFAULT_THEME.dup
    self.content ||= {}
    self.messages ||= []
  end
end
