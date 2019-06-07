(function(ext){
    //// Cleanup function when the extension is unloaded
    ext.variable={flag:false};
    ext._shutdown=function(){};
    ext._getStatus=function(){
      if(flag) return {status:2,msg:'connect the weather\'s api successfully'};
      else  return {status:1,msg:'can\'t connect the weather\'s api!!'};
    }
    ext.get_info=function(location){
        //make an AJAX call to get info of the Open Weather Maps API
        //通过正则表达式判断该参数的类型来获取对应的天气数据
          var url='api.openweathermap.org/data/2.5/weather?';
        //city name
          var pattern=/^[A-Z][a-z\s]+/;
          if(pattern.test(location)){
              url+='q='+location;
          }

        //city id
          pattern =/^[0-9]{7,7}$/;
          if(pattern.test(location)){
            url+='id='+location;
          }
        // geographic coordinates 
        pattern=/^[0-9]+,[0-9]+$/;
        if(pattern.test(location)){
          var coordinates=location.split(',');
          url+= 'lat='+coordinates[0]+'&lon='+coordinates[1];
        }

        $.ajax({
          url:url,
          dataType:'jsonp',
          success:function(weather_data){
            return weather_data['main']['temp'];
          }
        });
    };
    // Block and block menu descriptions
    var descriptor={
        blocks:[
            ['R','current information of the city %s','get_temp','Shanghai'],
        ]
    };
    //Register the extension
    ScratchExtensions.register('Weather Info',descriptor,ext);
})({})