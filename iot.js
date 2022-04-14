// Every IoTs have their own unique id
// Once the patients buy the sensor, they should get the uid
// This uid will decide the path to publish a mqtt topic

var awsIoT = require("aws-iot-device-sdk");
var moment = require("moment");
var lodash = require("lodash");

var uid = "5540a8ae-64ef-404b-aaa1-da010de7a638"; // IoT sensor uid

var sensor = awsIoT.device({
  keyPath:
    "./cert/sensor/daba7c709dc1c3621100bc0611fc2f359c19f7cf1d3c3c9f493245214b73d8e5-private.pem.key",
  certPath:
    "./cert/sensor/daba7c709dc1c3621100bc0611fc2f359c19f7cf1d3c3c9f493245214b73d8e5-certificate.pem.crt",
  caPath: "./cert/sensor/AmazonRootCA1.pem",
  clientId: `${uid}`,
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
        bpm: lodash.random(60, 100),
        // bpm: lodash.random(101, 150),
      })
    );

    console.log("Message sent...");
    await sleep(5000);
  }
});
