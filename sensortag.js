// */1 * * * * /usr/bin/node /home/pi/SensorTag/sensortag.js "b09122f67303" >> /var/log/templog.log 2>&1
// */1 * * * * /usr/bin/node /home/pi/SensorTag/sensortag.js "bc6a29ab3b07" >> /var/log/templog.log 2>&1
// */1 * * * * /usr/bin/node /home/pi/SensorTag/sensortag.js "bc6a29abebd3" >> /var/log/templog.log 2>&1

'use strict';
var SensorTag = require('sensortag');
SensorTag.SCAN_DUPLICATES = true;

var async = require('async');
var mqtt = require('mqtt');
var fs = require('fs');

var configFile = '/home/pi/hvstc/sensortag.json';
var config = JSON.parse(
    fs.readFileSync(configFile));

var tagUUID = process.argv[2] //config.uuid;

if (tagUUID == "b09122f67303") {var location = "fridge top"};
if (tagUUID == "bc6a29ab3b07") {var location = "fridge bottom"};
if (tagUUID == "bc6a29abebd3") {var location = "freezer"};

var EnableTimeout = config.EnableTimeout
var InitTagTimeout = config.InitTagTimeout

var tagEnabled = false;
var deviceInfo = {};
var deviceData = {};

// Configure and start MQTT connection
var mqttHost = config.MQTTHost;
var mqttPort = config.MQTTPort;
var mqttOptions = {
  host: mqttHost,
  port: mqttPort,
  keepalive: config.MQTTKeepAlive,
};
var mqttQos = config.MQTTQos;

var topic = 'hvs/temps';
var mqttClient = mqtt.connect('mqtt://' + mqttHost + ':' + mqttPort, mqttOptions);

var initTag = function() {
	setTimeout(function () {
        console.log("timeout completed " + tagUUID + " not found");
        process.exit(0); 
    }, 15000);
	
    console.log(new Date().toISOString() + " trying to find " + tagUUID);
    SensorTag.discoverByUuid(tagUUID,function(sensorTag){
        console.log("found " + sensorTag.uuid);
        newTagDiscovered(sensorTag);
        sensorTag.on('disconnect', function() {
            //mqttClient.end();
            console.log('disconnected!');
            process.exit(0);
        });
    });
}
    
var newTagDiscovered = function(sensorTag) {	
	
	console.log("Try to connect to %s...", sensorTag.id);
	sensorTag.connectAndSetUp(function (error) { 
		var tempString;
		console.log("Connected to %s...", sensorTag.id);
		
		//read device info
		async.series([
          function (callback) {
            sensorTag.readDeviceName(function (error, deviceName) {
              deviceInfo.deviceName = deviceName;
              deviceInfo.type = sensorTag.type;
              deviceInfo.uuid = sensorTag.uuid;
              callback();
            });
          },
          function (callback) {
            sensorTag.readFirmwareRevision(function (error, firmwareRevision) {
              deviceInfo.firmwareRevision = firmwareRevision;
              callback();
            });
          },
          function (callback) {
            sensorTag.readManufacturerName(function (error, manufacturerName) {
              deviceInfo.manufacturerName = manufacturerName;
              callback();
            });
          },
                		
		//enable services serially, currently we only enable the "weather" services
		function (callback) {
		  sensorTag.enableIrTemperature(function (error) {
			if (error) {
				console.log("error enabling ir temp");
			} else {
				//temp enabled
				//sensorTag.enableHumidity(function (error) {
				//	if (error) {
				//		console.log("error enabling humidity");
				//	} else {
				//		sensorTag.enableBarometricPressure(function (error) {
				//			if (error) {
				//				console.log("error enabling barometric");
				//			} else 
							if (sensorTag.type == "cc2650") 
							{
							   sensorTag.enableLuxometer(function (error) {
							   	if (error) {
							   		console.log("error enabling luxo jr");
							   	} else {	
							   		console.log("cc2650 services enabled");
							   		tagEnabled = true;							   		
							   		//getTagData(sensorTag);
							   	}
							   });
							}
							else {							   		
							   		console.log("cc2540 services enabled");
							   		tagEnabled = true;
							   		//getTagData(sensorTag);
							   	}	
						//});//end enable barometric
					//}
				//});//end enable humidity
			callback();
			}
		})
		
		},//end enable temp
	  	
	  	function (callback) {
                        //console.log("wait for timeout");
                        setTimeout(callback, EnableTimeout);
                      },  
	    ],
	  	function () {
                        tempString = JSON.stringify(deviceInfo);
                        console.log(tempString);
                        getTagData(sensorTag);
                      }
	    );// close async series	  
	});//end setup
}

var getTagData = function(sensorTag,response) {
	
	if (!tagEnabled) {
		return;
	}
	var sampleData = {};
	var tag = sensorTag;
	sampleData.uuid = tag.id;
	sampleData.time = Date();
	sampleData.loc = location;
	//tag.readHumidity(function (error, temperature, humidity) {
	//	console.log(tag.id, " humidity read with error:", error, " temp:", temperature, " humidity:", humidity);
	//	sampleData.humidity = humidity;
	//	sampleData.humidityTemperature = temperature;
		tag.readIrTemperature(function(error, objectTemperature, ambientTemperature) {
			//console.log(tag.id, " irtemp read with error:", error, " objtemp:", objectTemperature, " ambtemp:", ambientTemperature);
			sampleData.objectTemperature = objectTemperature.toFixed(2);
			sampleData.ambientTemperature = ambientTemperature.toFixed(2);
			//tag.readBarometricPressure(function(error, pressure) {
			//	console.log(tag.id, " baro read with error:", error, " pressure:", pressure);
			//	sampleData.pressure = pressure;
				if (tag.type == "cc2650")  {
				    tag.readLuxometer(function(error, lux) {
				  	    //console.log(tag.id, " lux read with error:", error, " lux:", lux);
				  	    sampleData.lux = lux;
				  	    tag.readBatteryLevel(function(error, batteryLevel) {
				  	     	//console.log(tag.id, " battery read with error:", error, " level:", batteryLevel);
				  	      	sampleData.batteryLevel = batteryLevel;
				  	      	//tag.readIoData(function(error, IoData) {
				  	     	//    console.log(tag.id, " IoData read with error:", error, " level:", IoData);
				  	      	//    sampleData.IoData = IoData;
				  	      	//    tag.readIoConfig(function(error, IoConfig) {
				  	     	//        //mqttClient.publish("hvs/temps", "test");
				  	     	//        console.log(tag.id, " IoConfig read with error:", error, " level:", IoConfig);
				  	      	//        sampleData.IoConfig = IoConfig;
                                    //tempString = JSON.stringify(deviceData);
                                    
                                    var tempString = JSON.stringify(sampleData);
                                    console.log(tempString);
                                        
                                    function mqttpub()  {
	                                    mqttClient.publish(topic, tempString, { qos: mqttQos});
	                                    endtagread();
	                                    
	                                    function endtagread() {
		                                    tag.disconnect();
	                                    };
	                                    
	                                    endtagread(mqttpub);
	                                    
                                    };
                                    
                                    function callmqtt() {
                                    };                                        
                                    mqttpub(callmqtt);
	                            //});// end readIOConfig
	                        //});// end read Io data 	  
					    });
				    });// end read lux
				}
				else {
					  sampleData.lux = null;
					  sampleData.batteryLevel = null;
					  var tempString = JSON.stringify(sampleData);
                      console.log(tempString);
                          
                      function mqttpub()  {
	                      mqttClient.publish(topic, tempString, { qos: mqttQos});
	                      endtagread();
	                      
	                      function endtagread() {
		                      tag.disconnect();
	                      };
	                      
	                      endtagread(mqttpub);
	                      
                      };
                      
                      function callmqtt() {
                      };                                        
                      mqttpub(callmqtt);
					 }
			//});//end read pressure	
		});//end read temp
    //});//end read humidity
}

//startup
var readTag = function () {
                  initTag();
                  return;
              };
readTag();