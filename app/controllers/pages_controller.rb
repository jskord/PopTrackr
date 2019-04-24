class PagesController < ApplicationController

  def index
    render 'index.html.erb'
  end
  def one
    @y_axis = []
    @x_axis = []
    ecoli_level = Unirest.get('https://data.cityofchicago.org/api/views/t62e-8nvc/rows.json?accessType=DOWNLOAD').body
    ecoli_level["data"].each do |level|
      @y_axis << level[10].to_i 
    end
    ecoli_level["data"].each do |level|
      @x_axis << Date.parse(level[9])
    end

    render 'cable.html.erb'
  end
end
