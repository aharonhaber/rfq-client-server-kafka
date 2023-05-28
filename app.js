////////////////////////////////////

const express = require('express');
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




const WebsocketProvider = require('web3-providers-ws');

// Create a new Web3 instance connected to your local Ethereum node
const web3 = new Web3(new WebsocketProvider('ws://localhost:8545'));

const testRFQJson = require('../test-rfq-client-hardhat/artifacts/contracts/TestRFQRequestor.sol/TestRFQRequestor.json');

const testRFQABI = testRFQJson.abi;
const testRFQAddress = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';

// Load the contract instance
const testRFQContract = new web3.eth.Contract(testRFQABI, testRFQAddress);


const oracleJson = require('../test-rfq-client-hardhat/artifacts/contracts/Oracle.sol/Oracle.json');
const oracleABI = oracleJson.abi;
const oracleAddress = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

// Load the contract instance
const oracleContract = new web3.eth.Contract(oracleABI, oracleAddress);


// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for events from the smart contract
  testRFQContract.events.OracleUpdate({}, (error, event) => {
    if (error) {
      console.error(error);
    } else {
      let data = JSON.parse(event.returnValues.requestUpdate);
      console.log('Start event emitted:', data);
      socket.emit('startEvent', data);
    }
  });

  oracleContract.events.NewRequest({}, async (error, event) => {
    if (error) {
      console.error(error);
    } else {
      let data = JSON.parse(event.returnValues.requestData);
      //console.log("event = ", event)
      let oracleId = event.returnValues.oracleId;
      console.log('Oracle New Request event emitted:', data);
      console.log('Oracle request Id = :', oracleId);

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


    }
  });


});




// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// REST API endpoint to call the start function of the smart contract
app.get('/callStartFunction', async (req, res) => {
  try {
    // Call the start function
    console.log("calling startRFQ");
    let requestId = "12345";
    let requestData = {
      symbol: "EURUSD",
      tenor: "Spot"
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

// Start the server
http.listen(3000, () => {
  console.log('Server is running on port 3000');
});
