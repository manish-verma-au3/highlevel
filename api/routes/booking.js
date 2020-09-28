var express = require('express');
var router = express.Router();
var admin = require("firebase-admin");
var serviceAccount = require("../serviceAccountKey.json");
var moment = require('moment-timezone');
const Moment = require('moment');
const MomentRange = require('moment-range');

const mymoment = MomentRange.extendMoment(Moment);
moment().format(); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
  });

const db = admin.firestore();

  // assumed static data
     // var date = '2019-11-15'
    // var startHours = "10AM";
    // var endHours = "17PM";
    // var duration = '30';
    // var timeZone = 'America/Los_Angeles';

    // note:- I have already created static data in database for date 2019-11-14,2019-11-15,2019-11-16,
    //       for testing,one can create extra slot by changing parameter in /createSlot

    //create slot api
  router.post('/createSlot', async function(req, res, next) {
    var mydate = '2019-11-16'
      function getTimeStops(){
        var startTime = moment('2019-11-16T10:00:00', 'YYYY-MM-DDTHH:mm:ss');
        var endTime = moment('2019-11-16T17:00:00', 'YYYY-MM-DDTHH:mm:ss');
        
        if( endTime.isBefore(startTime) ){
          endTime.add(1, 'day');
        }

        var timeStops = [];
        
        while(startTime <= endTime){
          timeStops.push(new moment(startTime).format('YYYY-MM-DDTHH:mm:ss'));
          startTime.add(30, 'minutes');
        }
        return timeStops;
      }
      var timeStops = getTimeStops('11:00', '02:00');
      timeStops = getTimeStops('11:00', '23:59');
      // console.log('timeStops ', timeStops);

      for(let i=0; i<timeStops.length; i++){
        await db.collection('timeSlot').doc(mydate).collection('available-slot').doc()
          .set({time: timeStops[i]}).then(() =>{
          console.log('new Dialogue written to database');
        });
      }
      res.status(200).send(timeStops)
  });

// -------------------------------------------------------------------------------------------------
  //check freeSlot API passdata in this format
  // {
  //   "date":"2019-11-15",
  //   "timeZone":"Asia/Kolkata"
  // }
  router.post('/freeslot', async function(req, res, next) {
    var mydate = req.body.date;
    var timeZone = req.body.timeZone;

    const slots = [];
    await db.collection('timeSlot').doc(mydate).collection('available-slot').get()
      .then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
        slots.push(doc.data().time);
      });
    });
    if (!Array.isArray(slots) || !slots.length){
      res.status(406).send("No free slots available")
    }else{
      //getting events
    const allreadyEvent = [];
    await db.collection('Events').get()
      .then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
        allreadyEvent.push(doc.data().event)
      });
  });
      var newArr1 = allreadyEvent.filter((i) => !slots.includes(i));
      var newArr2 = slots.filter((i) => !allreadyEvent.includes(i));
      var nomatches = newArr1.concat(newArr2);
      var finalMatch = [];
      for(let i=0; i<nomatches.length; i++){
        var m = moment.tz(nomatches[i], "America/Los_Angeles");
        var n = m.tz(timeZone).format('YYYY-MM-DDTHH:mm:ss')
        finalMatch.push(n);
      }
        console.log("original time",nomatches)
        res.status(200).send(finalMatch)
    }  
  });



// -------------------------------------------------------------------------------------------------
  //Create Event API passdata in this format 
  // {
  //   "DateTime":"2019-11-14T10:00:00",
  //   "Duration":"20"
  // }
  router.post('/createEvent', async function(req, res, next) {
    var myDateTime = req.body.DateTime;
    var myDuration = req.body.Duration;

    var myDateTimeArray = [myDateTime]
    var myDate = moment.utc(myDateTime).format('YYYY-MM-DD'); //getting date only
    //getting free events
    var slots = []
    await db.collection('timeSlot').doc(myDate).collection('available-slot').get()
      .then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
        slots.push(doc.data().time);
      });
    });
    console.log(slots)
    //getting already created events
    const allreadyEvent = [];
    await db.collection('Events').get()
      .then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
        allreadyEvent.push(doc.data().event)
      });
  });
  console.log('allreadyEvents',allreadyEvent);

    var num = myDuration / 30;
    console.log("num", num);
    if(num <= 1){
      console.log("0")
      //compare if freeslots have req timeSlot or not!
      let checker = (arr, target) => target.every(v => arr.includes(v));
      console.log(checker(slots, myDateTimeArray));
      //check no events are alredy created
      const found = allreadyEvent.some(r=> myDateTimeArray.includes(r));
      //creating event
      if(checker(slots, myDateTimeArray) === true && found === false)
      {
          for(let i=0; i<myDateTimeArray.length; i++){
            await db.collection('Events').doc()
              .set({event: myDateTimeArray[i]}).then(() =>{
              console.log('new Dialogue written to database');
            });
          }
          res.status(200).send(myDateTimeArray)
      }else{
        res.status(406).send("Invalid Event")
      }
    }else{
      console.log("1")
      var myLength = Math.floor(num)
      console.log('mylength', myLength);

      for(let i=0; i<myLength; i++){
        myDateTimeArray.push(moment(myDateTimeArray[myDateTimeArray.length-1]).add(30, 'minutes').format('YYYY-MM-DDTHH:mm:ss'))
      }
      console.log("myDateTimeArray", myDateTimeArray)
      //compare if freeslots have req timeSlot or not!
      let checker = (arr, target) => target.every(v => arr.includes(v));
      console.log(checker(slots, myDateTimeArray));
        //check no events are alredy created
      const found = allreadyEvent.some(r=> myDateTimeArray.includes(r));
      //creating event
      if(checker(slots, myDateTimeArray) === true && found === false)
      {
          for(let i=0; i<myDateTimeArray.length; i++){
            await db.collection('Events').doc()
              .set({event: myDateTimeArray[i]}).then(() =>{
              console.log('new Dialogue written to database');
            });
          }
          res.status(200).send(myDateTimeArray)
      }else{
        res.status(406).send("Invalid Event")
      }
    }
  });

// -------------------------------------------------------------------------------------------------
  //getEvent API passdata in this format
  // {
  //   "fromDate": "2019-11-14",
  //   "toDate": "2019-11-16"
  // }
  router.post('/getevents', async (req, res, next) => {
    var fromDate = req.body.fromDate;
    var toDate = req.body.toDate;
    var startDate = moment(new Date(fromDate));
    var endDate   = moment(new Date(toDate));
    //eventfetching
    const allreadyEvent = [];
    await db.collection('Events').get()
      .then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
        allreadyEvent.push(doc.data().event)
      });
  });
  console.log('allreadyEvent',allreadyEvent);
      var now = startDate.clone(), dates = [];
      while (now.isSameOrBefore(endDate)) {
          dates.push(now.format('YYYY-MM-DD'));
          now.add(1, 'days');
      }
      console.log(dates);
      //compare
      function getCommon(arr1, arr2) {
        var common = [];                   // Array to contain common elements
        for(var i=0 ; i<arr1.length ; ++i) {
          for(var j=0 ; j<arr2.length ; ++j) {
            if(moment.utc(arr1[i]).format('YYYY-MM-DD') == arr2[j]) {       
              common.push(arr1[i]);       
            }
          }
        }
        return common;                    
      }
      var commonElements = getCommon(allreadyEvent, dates);
      if (!Array.isArray(commonElements) || !commonElements.length){
        res.send('Events not available')
      }else{
        res.send(commonElements)
      }
  })


module.exports = router;
