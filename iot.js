// Every IoTs have their own unique id
// Once the patients buy the sensor, they should get the uid
// This uid will decide the path to publish a mqtt topic

var awsIoT = require("aws-iot-device-sdk");
var moment = require("moment");
var lodash = require("lodash");

var uid = "9225cba7-cefb-41cd-aecd-c2b8e9efa3c3"; // IoT sensor uid

var sensor = awsIoT.device({
  keyPath:
    "./cert/sensor/0e45ae1debffee602848b465bb30f523fa0bffa7b3e8005010556ad48debd626-private.pem.key",
  certPath:
    "./cert/sensor/0e45ae1debffee602848b465bb30f523fa0bffa7b3e8005010556ad48debd626-certificate.pem.crt",
  caPath: "./cert/sensor/AmazonRootCA1.pem",
  clientId: "9225cba7-cefb-41cd-aecd-c2b8e9efa3c3",
  host: "a3cbh27rhb0fvj-ats.iot.us-east-1.amazonaws.com",
  port: 8883,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

sensor.on("connect", async function () {
  console.log("connect");
  while (true) {
    sensor.publish(
      `DCS/pulseSensor/${uid}`,
      JSON.stringify({
        timeStamp: moment().local().format(),
        bpm: lodash.random(101, 150),
      })
    );

    console.log("Message sent...");
    await sleep(5000);
  }
});
