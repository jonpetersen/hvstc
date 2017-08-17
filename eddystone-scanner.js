'use strict';

var async = require('async');
var mqtt = require('mqtt');
var fs = require('fs');
var EddystoneBeaconScanner = require('eddystone-beacon-scanner');

var configFile = '/home/pi/hvstc/eddystone-scanner.json';
var config = JSON.parse(
    fs.readFileSync(configFile));

// Configure and start MQTT connection
var mqttHost = config.MQTTHost;
var mqttPort = config.MQTTPort;
var mqttOptions = {
  host: mqttHost,
  port: mqttPort,
  keepalive: config.MQTTKeepAlive,
  username: config.MQTTUsername,
  password: config.MQTTPassword
};
var mqttQos = config.MQTTQos;
var uuids = config.UUIDS;
var devices = config.DEVICES;
var inittagtimeout = config.InitTagTimeout;

var topic = config.MQTTTopic;
var mqttClient = mqtt.connect('mqtt://' + mqttHost + ':' + mqttPort, mqttOptions);

var devicesRead = [];
var devicesPushed = [];

var uuidcount = uuids.length;

function diffArray(arr1, arr2) {
  var newArr = arr1.concat(arr2);
  return newArr.filter(function(i){
    return newArr.indexOf(i) == newArr.lastIndexOf(i);
  });
}


var initTag = function() {

    EddystoneBeaconScanner.on('updated', function(beacon) {
       setTimeout(function () {
        //var devicenotfound = devicesPushed;
        var devicenotfound = diffArray(devicesPushed,uuids)
        console.log("timeout device at " + Date() + " device(s) " + devicenotfound + " not found");
        process.exit(0); 
       }, inittagtimeout);
    
      if (beacon.tlm)
    
         {
            var deviceData = {};
            
            // match name of device to uuid
            var uuidindex = uuids.indexOf(beacon.id)
            deviceData.loc = devices[uuidindex]
                    
            //if (beacon.id == "0117c536b80f") {deviceData.loc = "YUNZI"};
            //if (beacon.id == "0117c597916a") {deviceData.loc = "4AA"};
            //if (beacon.id == "0117c58898b8") {deviceData.loc = "USB"};
            
            deviceData.uuid = beacon.id;
            deviceData.ambientTemperature = beacon.tlm.temp;
            deviceData.time = Date();
            deviceData.batteryLevel = beacon.tlm.vbatt;
            deviceData.rssi = beacon.rssi;
            deviceData.lux = null
            deviceData.objectTemperature = null
            //if (beacon.distance)
            //   {
            //        deviceData.distance = beacon.distance;
            //        deviceData.txpower = beacon.txPower;
            //        //EddystoneBeaconScanner.stopScanning(true);
            //        if (devicesReadUnique.indexOf(beacon.id) === -1)
            //            {
    	    //                devicesReadUnique.push(beacon.id)    
            //            }                 
            //   };
            
            function countUnique(iterable) {
                return new Set(iterable).size;
            }
    
    		var devicesn = countUnique(devicesRead)
                                    
            if (devicesn < uuidcount)
                       {
    	               devicesRead.push(beacon.id);
    	               var tempString = JSON.stringify(deviceData);
                           
                       function mqttpub()  {
    		               if (devicesPushed.indexOf(beacon.id) === -1)
                              {
    		                   console.log(tempString);
    		                   devicesPushed.push(beacon.id);
    		                   mqttClient.publish(topic, tempString, { qos: mqttQos});
                               } 
                       };
                       
                       function callmqtt() {
                       };                                        
                       mqttpub(callmqtt);
                       
                    }
            else
                {
    			    console.log("all done stop scanning");
    			    process.exit(0);
    			    //EddystoneBeaconScanner.stopScanning(true);   
    		    };
            
         };
    
    });
    
    EddystoneBeaconScanner.startScanning(true);
};

//startup
var readSensors = function () {
                  initTag();
                  return;
              };
readSensors();
