class PagesController < ApplicationController

  def index
    render 'index.html.erb'
  end
  def one
    @y_axis = []
    @data = []
    @series = []
    ecoli_level = Unirest.get('https://data.cityofchicago.org/api/views/t62e-8nvc/rows.json?accessType=DOWNLOAD').body
    ecoli_level["data"].each do |level|
      @y_axis << level[10].to_i 
    end
    ecoli_level["data"].each do |level|
      date = level[9].to_time
      date_utc = date.to_f * 1000
      ecoli_concentration = level[10].to_i
      @data << [date_utc, ecoli_concentration]
    end

    render 'cable.html.erb'
  end
end
