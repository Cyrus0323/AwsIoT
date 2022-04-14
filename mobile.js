var awsIoT = require("aws-iot-device-sdk");
var AWS = require("aws-sdk");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

AWS.config.update({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
});

//--------------------------------User Sign Up-----------------------------------------
// After user sign up a new account
// The system should automatically assigned a new uid for each user
var uid = "622af3b7-43b0-438a-95d6-b3240f6ead48"; //patientID
//-------------------------------------------------------------------------------------

// In real world situation, it is not encouraged multiple devices connect to the same certificate due to security issues
// Each new user account, the system should automate the process of creating and assigning new certificate for each new user
var device = awsIoT.device({
  keyPath:
    "./cert/mobile/1f422a3bbdeb5f21b26dbaaa57530e9c2bd19f2a9bbc1d532e98aed8e279ec84-private.pem.key",
  certPath:
    "./cert/mobile/1f422a3bbdeb5f21b26dbaaa57530e9c2bd19f2a9bbc1d532e98aed8e279ec84-certificate.pem.crt",
  caPath: "./cert/mobile/AmazonRootCA1.pem",
  clientId: `${uid}`,
  host: "a3cbh27rhb0fvj-ats.iot.us-east-1.amazonaws.com",
  port: 8883,
});

//---------------------------------Login-------------------------------------
// require id_token in postman
const accessToken =
  "eyJraWQiOiI5TE5rTEdTUlNDTnpKdUcxdmFkWjdxRXJsTnd5NGljaFJUTTJmRkpUNkJzPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiME4yQWlKb01XSjFDZndOZUl1aGZvUSIsInN1YiI6IjYyMmFmM2I3LTQzYjAtNDM4YS05NWQ2LWIzMjQwZjZlYWQ0OCIsImF1ZCI6IjdiMWE0OTBrYXE3ZmczMTQ0dTVlMzBkaWJuIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjQ5OTIxNTY2LCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9iODc4a1VmSUMiLCJjb2duaXRvOnVzZXJuYW1lIjoiNjIyYWYzYjctNDNiMC00MzhhLTk1ZDYtYjMyNDBmNmVhZDQ4IiwiZXhwIjoxNjQ5OTI1MTY2LCJpYXQiOjE2NDk5MjE1NjYsImp0aSI6IjY4YmIxNmU4LTI5ZjYtNDYwYy05ZDRhLTc2ZTkxMzFhOGYzOSIsImVtYWlsIjoiY2xlZWppZTIwMEBnbWFpbC5jb20ifQ.XWBYLIXq2lhCiMCwo_LeKxs1U-rVJkF_PfmYveZ-nbQnMqyeA26U14h4Bf1Re7oJMevzFTnpBXFPW2sRHOYOQtGpm9AxncNUfUaZlUATmQ5ZivCc08yCcjqm9fdiN5rqS6uRIV-67_XoJSMM5faq1Qjlg11ovJXaZCa6fJpm675Xv8POAKq9r736VTxApK_C5f0E_CdafwP0SGaZYsZbiVjvm1jF3NSVodVwc6ithE0ZIwdHZgu1IY4ipSforF_JfM5ekgXXqfLQbwlopXjkyRJQR6Nfk3REWgKCfth8MbB44FX-4FEtkGuXY9SyKld9oaJWGTEboJzKK9vN8cU9ow";
// uid = "622af3b7-43b0-438a-95d6-b3240f6ead48"
//---------------------------------------------------------------------------

//---------------------------------User Interface-------------------------------------
var input = "5540a8ae-64ef-404b-aaa1-da010de7a638"; // sensor uid
var consecutiveHighBPM = 0;
var userEmail = "cleejie200@gmail.com";

//------------------------------------------------------------------------------------

//--------------------------------Backend process-------------------------------------
// subscription to a topic
device.on("connect", async function () {
  console.log("connect");
  device.subscribe(`DCS/pulseSensor/${input}`);
  console.log("subscribe");
});

device.on("message", async function (topic, payload) {
  console.log("message", topic, payload.toString());
  const message = JSON.parse(payload);
  console.log(message.timeStamp, message.bpm);

  // compare bpm
  if (message.bpm < 60 || message.bpm > 100) {
    consecutiveHighBPM++;
    console.log(consecutiveHighBPM);
  } else {
    consecutiveHighBPM = 0;
  }

  // Store into dynamodb through API Gateway
  var xhttp = new XMLHttpRequest();
  xhttp.open(
    "PUT",
    "https://yb192pp3r0.execute-api.us-east-1.amazonaws.com/demo/demo-dynamodb",
    true
  );
  xhttp.setRequestHeader("Authorization", "Bearer " + accessToken);
  xhttp.setRequestHeader("Content-type", "application/json");
  xhttp.onload = () => {
    if (xhttp.readyState === 4 && xhttp.status === 200) {
      console.log("Done");
    }
  };

  var iotData = {
    operation: "update",
    tableName: "dcs-demo-patient",
    payload: {
      Key: {
        patientID: `${uid}`,
      },
      UpdateExpression: "SET pulse = list_append(pulse, :p)",
      ExpressionAttributeValues: {
        ":p": [
          {
            timeStamp: message.timeStamp,
            bpm: message.bpm,
          },
        ],
      },
      ReturnValues: "UPDATED_NEW",
    },
  };

  xhttp.send(JSON.stringify(iotData));

  if (consecutiveHighBPM >= 1) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://sdkjy94qwg.execute-api.us-east-1.amazonaws.com/beta/analysis", true);
    xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.onload = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        console.log("Done");
      }
    };

    var iotAnalyse = {
      message: `${userEmail} needs attention!!!`,
    };

    xhr.send(JSON.stringify(iotAnalyse));
  }
});

device.on("error", function (topic, payload) {
  console.log("Error:", topic, payload.toString());
});

//------------------------------------------------------------------------------------
