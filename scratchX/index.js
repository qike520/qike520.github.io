(function(ext){
    //// Cleanup function when the extension is unloaded
    var variable={flag:true};
    ext._shutdown=function(){};
    ext._getStatus=function(){
      if(variable.flag) return {status:2,msg:'connect the weather\'s api successfully'};
      else  return {status:1,msg:'can\'t connect the weather\'s api!!'};
    }
    ext.get_info=function(location,callback){
        
        //make an AJAX call to get info of the Open Weather Maps API
        //通过正则表达式判断该参数的类型来获取对应的天气数据
          var url='api.openweathermap.org/data/2.5/weather?';
        //city name
        //simulate this process to get weather data
          var pattern=/^[A-Z][a-z\s]+/;
          if(pattern.test(location)){
              url+='q='+location;
              console.log("the "+location+"\'s temperature is 27.5℃");
          }

        //city id
          pattern =/^[0-9]{7,7}$/;
          if(pattern.test(location)){
            url+='id='+location;
             console.log("the "+location+"\'s temperature is 15℃");
          }
        // geographic coordinates 
        pattern=/^[0-9]+,[0-9]+$/;
        if(pattern.test(location)){
          var coordinates=location.split(',');
          url+= 'lat='+coordinates[0]+'&lon='+coordinates[1];
           console.log("the "+location+"\'s temperature is 125℃");
        }
        //about this get error:01:07:18 PM | err | Error: Error #1023 can't resolve
        // $.ajax({
        //   url:url,
        //   dataType:'jsonp',
        //   success:function(weather_data){
        //     console.log(weather_data['main']['temp']);
        //     return weather_data['main']['temp'];
        //   }
        // });



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