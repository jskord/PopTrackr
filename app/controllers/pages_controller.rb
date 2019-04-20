class PagesController < ApplicationController

  def index
    render 'index.html.erb'
  end
  def one
    render 'cable.html.erb'
  end
end
