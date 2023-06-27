////////////////////////////////////

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  },
});



const Web3 = require('web3');
const clients = new Set();




const WebsocketProvider = require('web3-providers-ws');

// Create a new Web3 instance connected to your local Ethereum node
const dltHostId = process.env.DLTHOSTIP || 'localhost'
console.log("SETTING DLT HOST ID to " +  dltHostId);
const web3 = new Web3(new WebsocketProvider('ws://' + dltHostId + ':8545'));

//const testRFQJson = require('../test-rfq-client-hardhat/artifacts/contracts/TestRFQRequestor.sol/TestRFQRequestor.json');
const testRFQJson = require('./contracts/TestRFQRequestor.json');

const testRFQABI = testRFQJson.abi;
const testRFQAddress = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';

// Load the contract instance
const testRFQContract = new web3.eth.Contract(testRFQABI, testRFQAddress);


//const oracleJson = require('../test-rfq-client-hardhat/artifacts/contracts/Oracle.sol/Oracle.json');
const oracleJson = require('./contracts/Oracle.json');
const oracleABI = oracleJson.abi;
const oracleAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

// Load the contract instance
const oracleContract = new web3.eth.Contract(oracleABI, oracleAddress);


// Listen for events from the smart contract

testRFQContract.events.OracleUpdate({}, (error, event) => {
  if (error) {
    console.error(error);
  } else {
    //console.log("OracleUpdate parsing : ",event.returnValues.requestUpdate)
    //console.log("OracleUpdate event : ",event)
    //console.log("here");
    //console.log("event = ", event);
    let data = JSON.parse(event.returnValues.requestUpdate);
    data.RFQid = event.returnValues.requestId;
    console.log('Update from Oracle received:', data);
    // Broadcast the event to all connected clients
    clients.forEach((client) => {
      client.emit('oracleUpdate', data);
    });    

  }
});
  

testRFQContract.events.SendOrderCalled({}, (error, event) => {
  if (error) {
    console.error(error);
  } else {
    //console.log("OracleUpdate parsing : ",event.returnValues.requestUpdate)
    //console.log("OracleUpdate event : ",event)
    //console.log("here");
    //console.log("event = ", event);
    let data = JSON.parse(event.returnValues.requestData);
    data.RFQid = event.returnValues.requestId;
    console.log('TestRFQContract Send Order Called received:', data);
    //socket.emit('reqeustData', data);
  }
});

oracleContract.events.RequestId(
{}, async (error, event) => {
  if (error) {
    console.error(error);
  } else {
    console.log("oracle id = ", event.returnValues.oracleId, " where = ", event.returnValues.where);
  }
})

oracleContract.events.NewRequest({}, async (error, event) => {
  if (error) {
    console.error(error);
  } else {
    let data = JSON.parse(event.returnValues.requestData);
    //console.log("event = ", event)
    let oracleId = event.returnValues.oracleId;
    console.log('Oracle New Request event emitted:', data);
    console.log('Oracle request Id = :', oracleId);
/* uncomment this to test publishing to dlt without oracle service
    try {
      // Call the start function
      console.log("calling oracle update");
      let updateData = {
        symbol: "EURUSD",
        tenor: "Spot",
        price: "103.23455"
      };

      const result = await oracleContract.methods.updateRequest(
        oracleId,
        "12344",
        JSON.stringify(updateData)
      ).send(
  
        { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', gas: 500000 });
      console.log("finished waiting for oracle update");
    } catch (error) {
      console.error(error);
    }      
*/

  }
});

oracleContract.events.NewTopicForRequest({}, async (error, event) => {
  if (error) {
    console.error(error);
  } else {
    let data = JSON.parse(event.returnValues.newRequestData);
    //console.log("event = ", event)
    let oracleId = event.returnValues.oracleId;
    let requestId = event.returnValues.requestId;

    console.log('Oracle New Topic for Request event emitted:', data);
    console.log('Oracle request Id = :', oracleId)
    console.log('Request Id = :', requestId)      

  }
});  
  

oracleContract.events.OracleResponse({}, async (error, event) => {
    if (error) {
      console.error(error);
    } else {
      //console.log(event);
      //let data = JSON.parse(event.returnValues.requestData);
      //console.log("event = ", event)
      //let oracleId = event.returnValues.oracleId;
      //console.log('Oracle Updated Request event emitted:', data);
      //console.log('Oracle request Id = :', oracleId);
/*
      try {
        // Call the start function
        console.log("calling oracle update");
        let updateData = {
          symbol: "EURUSD",
          tenor: "Spot",
          price: "103.23455"
        };

        const result = await oracleContract.methods.updateRequest(
          oracleId,
          "12344",
          JSON.stringify(updateData)
        ).send(
    
          { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', gas: 500000 });
        console.log("finished waiting for oracle update");
      } catch (error) {
        console.error(error);
      }      
*/

    }
});


// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');
  clients.add(socket);

  socket.on('close', () => {
    console.log('Client disconnected.');
    clients.delete(ws);
  });


});


app.use(bodyParser.json());

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


function getRandomMinMax(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


// REST API endpoint to call the start function of the smart contract
app.get('/callStartFunction', async (req, res) => {
  try {
    let rfqId = getRandomMinMax(1,10000);
    // Call the start function
    console.log("calling startRFQ");
    let requestId = rfqId.toString();
    let requestData = {
      MsgType: "StartRFQ",
      RFQid: requestId,
      symbol: "EURUSD",
      tenor: "Spot",
      qty: 1000000
    }
    const result = await testRFQContract.methods.startRFQ(
      requestId,
      JSON.stringify(requestData)
    ).send(

      { from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', gas: 500000 });
    console.log("finished waiting for startRFQ");
    res.status(200).json({ message: 'Start function called', txHash: result.transactionHash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error calling start function' });
  }
});

app.post('/sendOrder', async (req, res) => {
  const order = req.body.order;
  order.MsgType = "NewOrder";
  // Create a new Date object representing the current UTC timestamp
  var currentTimestamp = new Date(Date.now()).toISOString();
  order.Timestamp = currentTimestamp;  
  //abh reqeustData structure is shared with client - should be in a shared model file
  console.log('Received new order:', order);  
  let rfqId = order.RFQid;
  let orderAsString = JSON.stringify(order);
  console.log("sending order to dlt: ", orderAsString)
  try {
    const result = await testRFQContract.methods.sendOrder(
      rfqId,
      orderAsString,
    ).send({ from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', gas: 500000 });
    console.log("finished sending order");
    res.status(200).json({ message: 'Send Order called on DLT', txHash: result.transactionHash });
  }  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error calling Send Order function' });
  }
});

// Start the server
http.listen(3001, () => {
  console.log('Server is running on port 3000');
});
