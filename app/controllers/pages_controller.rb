class PagesController < ApplicationController

  def index
    render 'index.html.erb'
  end
  def cable
    render 'cable.html.erb'
  end
end
