class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  private

  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end
  helper_method :current_user

  def user_signed_in?
    current_user.present?
  end
  helper_method :user_signed_in?

  def authenticate_user!
    unless user_signed_in?
      respond_to do |format|
        format.html { redirect_to login_path, alert: "Please sign in to continue." }
        format.json { render json: { error: "Unauthorized" }, status: :unauthorized }
      end
    end
  end
end
