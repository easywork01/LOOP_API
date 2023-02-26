//jshint esversion: 6

const express = require("express");
const app = express();
const csv = require("csv-parser");
const fs = require('fs');
const moment = require('moment-timezone')
const fastcsv = require('fast-csv');

let arr1 = [];
let arr2 = [];
let arr3 = [];
let matchedData = [];

// Route for store status data
app.get("/storestatus", function(req, res) {
  fs.createReadStream("store_status.csv")
    .pipe(csv())
    .on("data", (data) => arr1.push(data))
    .on("end", () => {
      res.json(arr1);
    });
});

// Route for business hour data
app.get("/businesshours", function(req, res) {
  fs.createReadStream("business_hours.csv")
    .pipe(csv())
    .on("data", (data) => arr2.push(data))
    .on("end", () => {
      res.json(arr2);
    });
});

// Route for timezone data
app.get("/timezones", function(req, res) {
  fs.createReadStream("time_zone.csv")
    .pipe(csv())
    .on("data", (data) => arr3.push(data))
    .on("end", () => {
      res.json(arr3);
    });
});



app.get("/trigger_report", function(req, res){
  // empty array to store the matched data
   matchedData = [];

  for (let i = 0; i < arr1.length; i++) {
    let storeId = arr1[i].store_id;
    let timestampUTC = arr1[i].timestamp_utc;
    let storeStatus = arr1[i].status;

    // find the corresponding timezone for this store
    let timezoneRecord = arr3.find(record => record.store_id === storeId);
    let storeTimezone = timezoneRecord ? timezoneRecord.timezone_str : "America/Chicago";

    // convert the timestamp to the local time in the store's timezone
    let timestampLocal = moment.utc(timestampUTC).tz(storeTimezone);

    // find the corresponding business hours for this store and day of the week
    let dayOfWeek = timestampLocal.day();
    let businessHoursRecord = arr2.find(record => record.store_id === storeId && record.dayOfWeek === dayOfWeek);

    // determine if the store is open during this time
      let isOpen = true;
      if (businessHoursRecord) {
        let startTime = moment.tz(businessHoursRecord.start_time_local, storeTimezone);
        let endTime = moment.tz(businessHoursRecord.end_time_local, storeTimezone);
        isOpen = timestampLocal.isBetween(startTime, endTime, null, '[]');
      }

      // determine the downtime and uptime for the store during this hour
    let downtimeMinutes = 0;
    let uptimeMinutes = 0;
    if (storeStatus === "inactive") {
      downtimeMinutes = 60;
    } else if (!isOpen) {
      uptimeMinutes = 60;
    } else {
      uptimeMinutes = 60;
    }

    // add the matched data to the array
      matchedData.push({
        store_id: storeId,
        uptime_last_hour: uptimeMinutes,
        uptime_last_day: 0,
        downtime_last_hour: downtimeMinutes,
        downtime_last_day: 0,
        update_last_week: 0,
        downtime_last_week: 0,
      });

}//end of for Loop

// return sucess response
res.status(200).json({sucess:true});
});


app.get("/get-report", (req,res)=>{
  const matchedData = req.query.matchedData;
  const convertToCSV = (data => {
    const csv = fastcsv.write(data, {headers: true}).toString();
    return csv;
  });
  //convert matched data to csv
  const csvData = convertToCSV(matchedData);

  res.setHeader('Content-Disposition', 'attachment; filename=matched-data.csv');
  res.set('Content-Type', 'text/csv');
  res.status(200).send(csvData);
});
















// Create an empty array to store the matched data
// let matchedData = [];
//
// // Loop through each store status record
// for (let i = 0; i < arr1.length; i++) {
//   let storeId = arr1[i].store_id;
//   let timestampUTC = arr1[i].timestamp_utc;
//   let storeStatus = arr1[i].status;
//
//   // Find the corresponding timezone for this store
//   let timezoneRecord = arr3.find(record => record.store_id === storeId);
//   let storeTimezone = timezoneRecord ? timezoneRecord.timezone_str : "America/Chicago";
//
//   // Convert the timestamp to the local time in the store's timezone
//   let timestampLocal = moment.utc(timestampUTC).tz(storeTimezone);
//
//   // Find the corresponding business hours for this store and day of the week
//   let dayOfWeek = timestampLocal.day();
//   let businessHoursRecord = arr2.find(record => record.store_id === storeId && record.dayOfWeek === dayOfWeek);
//
//   // Determine if the store is open during this time
//     let isOpen = true;
//     if (businessHoursRecord) {
//       let startTime = moment.tz(businessHoursRecord.start_time_local, storeTimezone);
//       let endTime = moment.tz(businessHoursRecord.end_time_local, storeTimezone);
//       isOpen = timestampLocal.isBetween(startTime, endTime, null, '[]');
//     }
//
//     // Determine the downtime and uptime for the store during this hour
//   let downtimeMinutes = 0;
//   let uptimeMinutes = 0;
//   if (storeStatus === "inactive") {
//     downtimeMinutes = 60;
//   } else if (!isOpen) {
//     uptimeMinutes = 60;
//   } else {
//     uptimeMinutes = 60;
//   }
//   // Add the matched data to the array
//     matchedData.push({
//       store_id: storeId,
//       uptime_last_hour: uptimeMinutes,
//       uptime_last_day: 0,
//       downtime_last_hour: downtimeMinutes,
//       downtime_last_day: 0,
//       update_last_week: 0,
//       downtime_last_week: 0,
//     });
//   }


// function to convert matchedDataarray to CSV file
// const convertToCSv = (data)=> {
//   const csv = fastcsv.write(data, {headers: true}).toString();
//   return csv;
// };

//route to return matched data as CSV file
// app.get('/matched-data-csv', (req,res)=>{
//   const csvData = convertToCSV(matchedData);
//
//   res.setHeader('Content-Disposition', 'attachment; filename=matched-data.csv');
//   res.set('Content-Type', 'text/csv');
//   res.status(200).send(csvData);
// });


// fs.readFile("store_status.csv", "utf8", function(err, data) {
//   if (err) {
//     console.error(err);
//     return;
//   }
//
//   console.log(data);
// });
//this code prints data in console

app.listen(3000, function(){
  console.log("sever is running on port 3000");
});
