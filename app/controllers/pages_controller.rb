class PagesController < ApplicationController

  def index
    render 'index.html.erb'
  end
  def one
    @employees = Unirest.get('https://data.cityofchicago.org/resource/xzkq-xp2w.json').body

    render 'cable.html.erb'
  end
end
