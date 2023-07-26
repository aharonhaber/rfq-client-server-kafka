////////////////////////////////////
const axios = require('axios');
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


//client to socket
const clients = new Map();


//rfqs to client
const rfqs = new Map();

// Function to find a value for a key in the Map
const findInMap = (key, map) => {
  console.log("find in map");
  //map.forEach((value, ikey) => { console.log(`key ${ikey} value ${value} typeof key ${typeof ikey}`); } );   
  console.log(`looking for key ${key} typeof key ${typeof key} `)
  const value = map.get(key);
  console.log(`value = ${value}`);
  if (value === undefined) {
    // Handle the case when the key (rfq) is not found in the map
    console.log(`Value not found for key: ${key}`);
  } else {
    console.log(`Value for key ${key}: ${value}`);
    return value;
  }
};



const WebsocketProvider = require('web3-providers-ws');

// Create a new Web3 instance connected to your local Ethereum node
const dltHostId = process.env.DLTHOSTIP || 'localhost'
const eventHostId = process.env.EVENTHOSTIP || 'localhost'
const eventHostPort = process.env.EVENTHOSTPORT || '3003'
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
    let data = JSON.parse(event.returnValues.requestUpdate);
    data.rfqId = event.returnValues.requestId;
    console.log('Update from Oracle received:', data);
    registerEvent("RFQ SC from Oracle", data.rfqId, "The testRFQContract received an OracleUpdate");  
    
    let client = findInMap(data.rfqId,rfqs)
    if (client != undefined) {
      let ws = findInMap(client, clients)
      if (ws != undefined) {
        ws.emit('oracleUpdate', data);
      } else {
        console.log(`cannot find websocket for client ${client}`)
      }
    } else {
      console.log(`cannot find client for rfq ${data.rfqId}`)
    }
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
    data.rfqId = event.returnValues.requestId;
    console.log('TestRFQContract Send Order Called received:', data);
    registerEvent("SendOrder Call - RFQObject", data.rfqId, "TestRFQ Obejct has posted event - SendOrder was called");       
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
    let requestId = event.returnValues.requestId;    
    console.log('Oracle New Request event emitted:', data);
    console.log('Oracle request Id = :', oracleId);
    registerEvent("Oracle New Request", requestId, "Oracle Contract posted event: received a newrequest");    
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
    registerEvent("Oracle New Topic", requestId, "oracle contract posted event: New Topic for request");
  }
});  
  

oracleContract.events.OracleResponse({}, async (error, event) => {
    if (error) {
      console.error(error);
    } else {
      console.log("Oracle Response event received");

    }
});


// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');


  socket.on('close', () => {
    // Handle WebSocket connection closure
    for (const [clientId, clientWs] of clients.entries()) {
      if (clientWs === socket) {
        clients.delete(clientId); // Remove the client Id and WebSocket connection on closure
        console.log(`Client ${clientId} disconnected.`);
        break;
      }
    }
  });

  socket.on('register', (message) => {
    console.log(message);
    const clientId = message.clientId;    
    clients.set(clientId, socket); // Store the client Id and WebSocket connection
    console.log(`Client ${clientId} registered.`);
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

function registerEvent (_name, _id, _description) {

  console.log("register event called");
  const _clientTime = new Date().toISOString();

  const eventData = {
    module: "UI Server",
    clientTime: _clientTime,
    name: _name,
    id: _id,
    description: _description
  };
  
  axios.post('http://'+eventHostId+':'+eventHostPort+'/registerEvent', eventData)
    .then((response) => {
      console.log('Event registered successfully');
    })
    .catch((error) => {
      console.error('Failed to register event - is the server running?');
    });  

}

// REST API endpoint to call the start function of the smart contract
app.post('/startRFQ', async (req, res) => {
  try {
    console.log("req = ", req.body);
    const ccyPair  = req.body.ccyPair;
    const clientId = req.body.clientId;
    let rfqId = getRandomMinMax(1,10000);
    // Call the start function

    //store the mapping of client to rfq so when events come for rfq can be sent to the specific client
    console.log(`mapping ${rfqId} to ${clientId}`)
    console.log("1 rfqs size is ", rfqs.size);
    rfqs.set(String(rfqId), clientId);
    console.log("2 rfqs size is ", rfqs.size);    
    rfqs.forEach((value, key) => { console.log(`key ${key} value ${value}`); } );
    console.log("3 rfqs size is ", rfqs.size);

    let requestId = rfqId.toString();
    let requestData = {
      msgType: "StartRFQ",
      rfqId: requestId,
      symbol: ccyPair,
      tenor: "Spot",
      ccy: ccyPair.substring(0,3),
      client:"CitiClient",
      qty: 1000000
    }
    console.log("calling startRFQ with ", requestData);


    registerEvent("Start RFQ", rfqId, "rfsserver calling startRFQ of testRFQContract");

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
  order.msgType = "NewOrder";
  // Create a new Date object representing the current UTC timestamp
  var currentTimestamp = new Date(Date.now()).toISOString();
  order.Timestamp = currentTimestamp;  
  //abh reqeustData structure is shared with client - should be in a shared model file
  console.log('Received new order:', order);  
  let rfqId = order.rfqId;
  let orderAsString = JSON.stringify(order);
  console.log("sending order to dlt: ", orderAsString)
  try {
    registerEvent("SendOrder", rfqId, "rfsserver calling SendOrder of TestRFQContract");
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
  console.log('Server is running on port 3001');
});
