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
var uid = "2b54fd90-d74a-4d4a-af2c-7863f696c150";
//-------------------------------------------------------------------------------------

// In real world situation, it is not encouraged multiple devices connect to the same certificate due to security issues
// Each new user account, the system should automate the process of creating and assigning new certificate for each new user
var device = awsIoT.device({
  keyPath:
    "./cert/mobile/d4f36feaa2572f712ad89898833e8eedae9682dce4a1542518fcb42a65a604bb-private.pem.key",
  certPath:
    "./cert/mobile/d4f36feaa2572f712ad89898833e8eedae9682dce4a1542518fcb42a65a604bb-certificate.pem.crt",
  caPath: "./cert/mobile/AmazonRootCA1.pem",
  clientId: "2b54fd90-d74a-4d4a-af2c-7863f696c150",
  host: "a3cbh27rhb0fvj-ats.iot.us-east-1.amazonaws.com",
  port: 8883,
});

//---------------------------------Login-------------------------------------
// require id_token in postman
const accessToken =
  "eyJraWQiOiJ6c3lZcldzcjR3UTE4S0FZYVdTVVhQUW54TzJkN0tnMFdxOG9ZS2FqSU84PSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiNlRDa2hVY0VKV0l5RHY5MzFHenlRdyIsInN1YiI6IjJiNTRmZDkwLWQ3NGEtNGQ0YS1hZjJjLTc4NjNmNjk2YzE1MCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9haHZDV0xLdjUiLCJjb2duaXRvOnVzZXJuYW1lIjoiMmI1NGZkOTAtZDc0YS00ZDRhLWFmMmMtNzg2M2Y2OTZjMTUwIiwiYXVkIjoiOW9wNXNrZDA0ZHJ0MGlxOGM3a3RxZW5uciIsImV2ZW50X2lkIjoiYjM3ODcyYmUtODU3Yy00ZjhkLWI4MWQtNDAzMWIyZGJiOGZiIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2NDgzOTczNjcsImV4cCI6MTY0ODQwMDk2NywiaWF0IjoxNjQ4Mzk3MzY3LCJqdGkiOiIyMWI0MTVhMS0yZmQ0LTRlYzctOWQ3NS1hYTNhYjRjOTMxZDAiLCJlbWFpbCI6ImNsZWVqaWUyMDBAZ21haWwuY29tIn0.Xe05Mb4plQWek9JEPdurUjjeufU7XjHJHy8TjAwV09F4Y2jdB7GAIgt-8qZAkiwcXYxPT3xt7G1DjQPND7lW1rjUt57NKV7BiI8vBnINt1nrcyBNgaaYZNXTpoKoPSBLU6gKBBCQts0FtEVICQtZZu3-mk1VqYgr8r1kWje5_17gUpHxxY9bZEEux60ec-rgEVcC0BMjmvh5IzEsvwW7lLHfPFCGitVAx2gzh6oNf9MYXk14HokvBteTV5zuBjxnrvKr0BuZS_O7cAFjkjRw9pFRwB2qYUMJ69SR1rlN7TU0ygYlAqo2HyzjTo32xS4GepBLnPCmZgoGwUCTFhN0Ow";
const user_id = "2b54fd90-d74a-4d4a-af2c-7863f696c150";
//---------------------------------------------------------------------------

//---------------------------------User Interface-------------------------------------
var input = "9225cba7-cefb-41cd-aecd-c2b8e9efa3c3"; // sensor uid
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
  console.log(typeof message.bpm);
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
    "https://sdkjy94qwg.execute-api.us-east-1.amazonaws.com/beta/sensor",
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
    tableName: "DCS-Heart_Failure_Monitoring",
    payload: {
      Key: {
        patient_key: `${user_id}`,
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
