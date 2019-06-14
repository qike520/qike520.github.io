// arduino.js

(function(ext) {
	var device = null;
	var _rxBuf = [];

    // Sensor states:
    var ports = {
    	Port1: 1,
    	Port2: 2,
    	Port3: 3,
    	Port4: 4,
    	Port5: 5,
    	Port6: 6,
    	Port7: 7,
    	Port8: 8,
    	M1:9,
    	M2:10
    };
    var slots = {
    	Slot1:1,
    	Slot2:2
    };
    var switchStatus = {
    	On:1,
    	Off:0
    };
    var levels = {
    	HIGH:1,
    	LOW:0
    };
    var axis = {
    	'X-Axis':1,
    	'Y-Axis':2,
    	'Z-Axis':3
    }
    var tones ={"B0":31,"C1":33,"D1":37,"E1":41,"F1":44,"G1":49,"A1":55,"B1":62,
    "C2":65,"D2":73,"E2":82,"F2":87,"G2":98,"A2":110,"B2":123,
    "C3":131,"D3":147,"E3":165,"F3":175,"G3":196,"A3":220,"B3":247,
    "C4":262,"D4":294,"E4":330,"F4":349,"G4":392,"A4":440,"B4":494,
    "C5":523,"D5":587,"E5":659,"F5":698,"G5":784,"A5":880,"B5":988,
    "C6":1047,"D6":1175,"E6":1319,"F6":1397,"G6":1568,"A6":1760,"B6":1976,
    "C7":2093,"D7":2349,"E7":2637,"F7":2794,"G7":3136,"A7":3520,"B7":3951,
    "C8":4186,"D8":4699};
    var beats = {"Half":500,"Quarter":250,"Eighth":125,"Whole":1000,"Double":2000,"Zero":0};
    var values = {};
    var indexs = [];
    
    var startTimer = 0;
    var versionIndex = 0xFA;
    ext.resetAll = function(){
    	device.send([0xff, 0x55, 2, 0, 4]);
    };
    
    ext.runArduino = function(){
    	responseValue();
    };
    ext.runDigital = function(pin,level) {
    	runPackage(30,pin,typeof level=="string"?levels[level]:new Number(level));
    };
    ext.runPwm = function(pin,pwm) {
    	runPackage(32,pin,pwm);
    };
    ext.runTone = function(pin,tone,beat){
    	runPackage(34,pin,short2array(typeof tone=="number"?tone:tones[tone]),short2array(typeof beat=="number"?beat:beats[beat]));
    };
    ext.runServoArduino = function(pin, angle){
    	runPackage(33,pin,angle);
    };
    ext.resetTimer = function(){
    	startTimer = new Date().getTime();
    	responseValue();
    };
    ext.getDigital = function(nextID,pin){
    	var deviceId = 30;
    	getPackage(nextID,deviceId,pin);
    };
    ext.getAnalog = function(nextID,pin) {
    	var deviceId = 31;
    	getPackage(nextID,deviceId,pin);
    };
    ext.getPulse = function(nextID,pin,timeout) {
    	var deviceId = 37;
    	getPackage(nextID,deviceId,pin,short2array(timeout));
    };
    ext.getUltrasonicArduino = function(nextID,trig,echo){
    	var deviceId = 36;
    	getPackage(nextID,deviceId,trig,echo);
    }
    ext.getTimer = function(nextID){
    	if(startTimer==0){
    		startTimer = new Date().getTime();
    	}
    	responseValue(nextID,new Date().getTime()-startTimer);
    }

    function sendPackage(argList, type){
    	var bytes = [0xff, 0x55, 0, 0, type];
    	for(var i=0;i<argList.length;++i){
    		var val = argList[i];
    		if(val.constructor == "[class Array]"){
    			bytes = bytes.concat(val);
    		}else{
    			bytes.push(val);
    		}
    	}
    	bytes[2] = bytes.length - 3;
    	device.send(bytes);
    }
    
    function runPackage(){
    	sendPackage(arguments, 2);
    }
    function getPackage(){
    	var nextID = arguments[0];
    	Array.prototype.shift.call(arguments);
    	sendPackage(arguments, 1);
    }

    var inputArray = [];
    var _isParseStart = false;
    var _isParseStartIndex = 0;
    function processData(bytes) {
    	var len = bytes.length;
    	if(_rxBuf.length>30){
    		_rxBuf = [];
    	}
    	for(var index=0;index<bytes.length;index++){
    		var c = bytes[index];
    		_rxBuf.push(c);
    		if(_rxBuf.length>=2){
    			if(_rxBuf[_rxBuf.length-1]==0x55 && _rxBuf[_rxBuf.length-2]==0xff){
    				_isParseStart = true;
    				_isParseStartIndex = _rxBuf.length-2;
    			}
    			if(_rxBuf[_rxBuf.length-1]==0xa && _rxBuf[_rxBuf.length-2]==0xd&&_isParseStart){
    				_isParseStart = false;
    				
    				var position = _isParseStartIndex+2;
    				var extId = _rxBuf[position];
    				position++;
    				var type = _rxBuf[position];
    				position++;
					//1 byte 2 float 3 short 4 len+string 5 double
					var value;
					switch(type){
						case 1:{
							value = _rxBuf[position];
							position++;
						}
						break;
						case 2:{
							value = readFloat(_rxBuf,position);
							position+=4;
							if(value<-255||value>1023){
								value = 0;
							}
						}
						break;
						case 3:{
							value = readInt(_rxBuf,position,2);
							position+=2;
						}
						break;
						case 4:{
							var l = _rxBuf[position];
							position++;
							value = readString(_rxBuf,position,l);
						}
						break;
						case 5:{
							value = readDouble(_rxBuf,position);
							position+=4;
						}
						break;
						case 6:
						value = readInt(_rxBuf,position,4);
						position+=4;
						break;
					}
					if(type<=6){
						responseValue(extId,value);
					}else{
						responseValue();
					}
					_rxBuf = [];
				}
			} 
		}
	}
	function readFloat(arr,position){
		var f= [arr[position],arr[position+1],arr[position+2],arr[position+3]];
		return parseFloat(f);
	}
	function readInt(arr,position,count){
		var result = 0;
		for(var i=0; i<count; ++i){
			result |= arr[position+i] << (i << 3);
		}
		return result;
	}
	function readDouble(arr,position){
		return readFloat(arr,position);
	}
	function readString(arr,position,len){
		var value = "";
		for(var ii=0;ii<len;ii++){
			value += String.fromCharCode(_rxBuf[ii+position]);
		}
		return value;
	}
	function appendBuffer( buffer1, buffer2 ) {
		return buffer1.concat( buffer2 );
	}

    // Extension API interactions
    var potentialDevices = [];
    ext._deviceConnected = function(dev) {
    	potentialDevices.push(dev);

    	if (!device) {
    		tryNextDevice();
    	}
    }

    function tryNextDevice() {
        // If potentialDevices is empty, device will be undefined.
        // That will get us back here next time a device is connected.
        device = potentialDevices.shift();
        if (device) {
        	device.open({ stopBits: 0, bitRate: 115200, ctsFlowControl: 0 }, deviceOpened);
        }
    }

    var watchdog = null;
    function deviceOpened(dev) {
    	if (!dev) {
            // Opening the port failed.
            tryNextDevice();
            return;
        }
        device.set_receive_handler('arduino',processData);
    };

    ext._deviceRemoved = function(dev) {
    	if(device != dev) return;
    	device = null;
    };

    ext._shutdown = function() {
    	if(device) device.close();
    	device = null;
    };

    ext._getStatus = function() {
    	if(!device) return {status: 1, msg: 'Arduino disconnected'};
    	if(watchdog) return {status: 1, msg: 'Probing for Arduino'};
    	return {status: 2, msg: 'Arduino connected'};
    }

    var descriptor = {
    	blocks:[
    	["h","Arduino Program","runArduino"],
    	
    	["B", "read digital pin %n","getDigital","9",
    	{"encode":"{d0}","setup":"pinMode({0},INPUT);\n","inc":"","def":"","work":"digitalRead({0})","loop":""}],
    	
    	["R", "read analog pin (A)%n","getAnalog","0",
    	{"encode":"{d0}","setup":"pinMode(A0+{0},INPUT);\n","inc":"","def":"","work":"analogRead(A0+{0})","loop":""}],
    	
    	["R", "read pulse pin %n timeout %n","getPulse","13",20000,
    	{"encode":"{d0}","setup":"pinMode({0},INPUT);\n","inc":"","def":"","work":"pulseIn({0},HIGH,{1})","loop":""}],
    	
    	["w", "set digital pin %n output as %d.digital","runDigital", "9", "HIGH",
    	{"encode":"{d0}{d1}","setup":"pinMode({0},OUTPUT);\n","inc":"","def":"","work":"digitalWrite({0},{1});\n","loop":""}],
    	
    	["w", "set pwm pin %n output as %d.pwmvalue","runPwm", "5", 0,
    	{"encode":"{d0}{d1}","setup":"pinMode({0},OUTPUT);\n","inc":"","def":"","work":"analogWrite({0},{1});\n","loop":""}],
    	
    	["w", "play tone pin %n on note %d.notes beat %d.beats","runTone", "9", "C4","Half",
    	{"encode":"{d0}{s1}{s2}","setup":"pinMode({0},OUTPUT);\n","inc":"","def":"","work":"tone({0},{1},{2}); // write to buzzer\ndelay({2});\n","loop":""}],
    	
    	["w", "set servo pin %n angle as %d.servovalue","runServoArduino", "9", 90,
    	{"encode":"{d0}{d1}","setup":"servo_{0}.attach({0}); // init pin\n","inc":"#include <Servo.h>\n","def":"Servo servo_{0};\n","work":"servo_{0}.write({1}); // write to servo\n","loop":""}],
    	
    	["w", "serial write text %s", "serialWrite", "hello",
    	{"setup":"Serial.begin(9600);\n","inc":"","def":"","work":"Serial.println({0});\n","loop":""}],
    	
    	["R", "serial available bytes", "serialAvailable",
    	{"setup":"Serial.begin(9600);\n","inc":"","def":"","work":"Serial.available()","loop":""}],
    	
    	["R", "serial read byte", "serialRead",
    	{"setup":"Serial.begin(9600);\n","inc":"","def":"","work":"Serial.read()","loop":""}],
    	
    	["R", "read ultrasonic sensor trig pin %n echo pin %n","getUltrasonicArduino",13,12,
    	{"encode":"{d0}","setup":"","inc":"","def":"--separator--float getDistance(int trig,int echo){\npinMode(trig,OUTPUT);\ndigitalWrite(trig,LOW);\ndelayMicroseconds(2);\ndigitalWrite(trig,HIGH);\ndelayMicroseconds(10);\ndigitalWrite(trig,LOW);\npinMode(echo, INPUT);\nreturn pulseIn(echo,HIGH,30000)/58.0;\n}\n","work":"getDistance({0},{1})","loop":""}],
    	
    	["R", "timer","getTimer", "0",
    	{"encode":"{n0}","setup":"","inc":"","def":"double currentTime = 0;\ndouble lastTime = 0;\ndouble getLastTime(){\n\treturn currentTime = millis()/1000.0 - lastTime;\n}\n","work":"getLastTime()","loop":""}],
    	
    	["w", "reset timer","resetTimer", "0",
    	{"encode":"{n0}","setup":"","inc":"","def":"double currentTime = 0;\ndouble lastTime = 0;\n","work":"lastTime = millis()/1000.0;\n","loop":""}]
    	],
    	menus:{
    		beats:["500","250","125","1000","2000","0"],
    		servovalue:["0","45","90","135","180"],
    		pwmvalue:["0","50","100","150","255"],
    		digital:["HIGH","LOW"],
    		notes:["C2","D2","E2","F2","G2","A2","B2","C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4","A4","B4","C5","D5","E5","F5","G5","A5","B5","C6","D6","E6","F6","G6","A6","B6","C7","D7","E7","F7","G7","A7","B7","C8","D8"],
    		beats:["Half","Quarter","Eighth","Whole","Double","Zero"]
    	}


    };
    ScratchExtensions.register('Arduino', descriptor, ext, {type: 'serial'});
})({});
