class PagesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_page, only: %i[show update destroy store load]

  # GET /pages - Main editor view with page list
  def index
    @pages = current_user.pages.order(updated_at: :desc)
    @current_page = @pages.first || current_user.pages.create!(name: "My First Page")
    @pages = current_user.pages.order(updated_at: :desc) unless @pages.include?(@current_page)
  end

  # GET /pages/:id - Load specific page in editor
  def show
    @pages = current_user.pages.order(updated_at: :desc)
    @current_page = @page
  end

  # POST /pages - Create new page
  def create
    @page = current_user.pages.build(page_params)

    respond_to do |format|
      if @page.save
        format.html { redirect_to page_path(@page), notice: "Page created." }
        format.json { render json: page_json(@page), status: :created }
        format.turbo_stream
      else
        format.html { redirect_to pages_path, alert: @page.errors.full_messages.join(", ") }
        format.json { render json: { errors: @page.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /pages/:id - Update page
  def update
    respond_to do |format|
      if @page.update(page_params)
        format.html { redirect_to page_path(@page), notice: "Page updated." }
        format.json { render json: page_json(@page) }
        format.turbo_stream
      else
        format.html { redirect_to page_path(@page), alert: @page.errors.full_messages.join(", ") }
        format.json { render json: { errors: @page.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /pages/:id - Delete page
  def destroy
    @page.destroy

    respond_to do |format|
      format.html { redirect_to pages_path, notice: "Page deleted." }
      format.json { head :no_content }
      format.turbo_stream
    end
  end

  # POST /pages/:id/store - GrapesJS remote storage endpoint (save)
  def store
    # GrapesJS sends the full project data
    project_data = params.permit!.to_h.except(:controller, :action, :id, :format)

    # Extract HTML/CSS for all pages if provided
    pages_html = params[:pagesHtml]
    if pages_html.present? && pages_html.is_a?(Array)
      # Store the first page's HTML/CSS (single page mode)
      first_page = pages_html.first
      if first_page
        @page.html = first_page["html"]
        @page.css = first_page["css"]
      end
    end

    @page.content = project_data
    @page.touch

    if @page.save
      render json: { success: true, id: @page.id }
    else
      render json: { error: @page.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  # GET /pages/:id/load - GrapesJS remote storage endpoint (load)
  def load
    render json: @page.content.presence || {}
  end

  private

  def set_page
    @page = current_user.pages.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { redirect_to pages_path, alert: "Page not found." }
      format.json { render json: { error: "Page not found" }, status: :not_found }
    end
  end

  def page_params
    params.require(:page).permit(:name, :html, :css, theme: {}, messages: [])
  rescue ActionController::ParameterMissing
    params.permit(:name, :html, :css, theme: {}, messages: [])
  end

  def page_json(page)
    {
      id: page.id,
      name: page.name,
      theme: page.theme_with_defaults,
      messages: page.messages,
      content: page.content,
      html: page.html,
      css: page.css,
      updated_at: page.updated_at
    }
  end
end
