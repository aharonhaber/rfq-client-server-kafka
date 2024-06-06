const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const { connectProducer, connectConsumer, sendMessage, consumeMessages } = require('./kafkaInterface');

const app = express();
// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.use(cors({
  origin: '*'
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  },
});

const eventHostId = process.env.EVENTHOSTIP || 'localhost'
const eventHostPort = process.env.EVENTHOSTPORT || '3003'



const clients = new Map();
const rfqs = new Map();

// Utility function to find a value for a key in the Map
const findInMap = (key, map) => {
  console.log("find in map");
  console.log(`looking for key ${key} typeof key ${typeof key} `);
  const value = map.get(key);
  console.log(`value = ${value}`);
  if (value === undefined) {
    console.log(`Value not found for key: ${key}`);
  } else {
    console.log(`Value for key ${key}: ${value}`);
    return value;
  }
};

// Connect Kafka producer and consumer with retry logic
connectProducer().then(() => console.log('Kafka Producer connected'));
connectConsumer().then(() => console.log('Kafka Consumer connected'));

// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('close', () => {
    for (const [clientId, clientWs] of clients.entries()) {
      if (clientWs === socket) {
        clients.delete(clientId);
        console.log(`Client ${clientId} disconnected.`);
        break;
      }
    }
  });

  socket.on('register', (message) => {
    const clientId = message.clientId;
    clients.set(clientId, socket);
    console.log(`Client ${clientId} registered.`);
  });
});

// Update to use Kafka for startRFQ
app.post('/startRFQ', async (req, res) => {
  try {
    console.log("req = ", req.body);
    const ccyPair = req.body.ccyPair;
    const clientId = req.body.clientId;
    let rfqId = getRandomMinMax(1, 10000);
    rfqs.set(String(rfqId), clientId);

    let requestId = rfqId.toString();
    let requestData = {
      msgType: "StartRFQ",
      rfqId: requestId,
      symbol: ccyPair,
      tenor: "Spot",
      ccy: ccyPair.substring(0, 3),
      client: "CitiClient",
      qty: 1000000
    };

    registerEvent("Start RFQ", rfqId, "rfsserver calling startRFQ");
    await sendMessage('from_oracle', {
      body: JSON.stringify(requestData),
      conversationId: requestId
    });

    res.status(200).json({ message: 'Start function called' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error calling start function' });
  }
});

// Update to use Kafka for sendOrder
app.post('/sendOrder', async (req, res) => {
  const order = req.body.order;
  order.msgType = "NewOrder";
  order.timestamp = new Date(Date.now()).toISOString();

  try {
    registerEvent("SendOrder", order.rfqId, "rfsserver calling SendOrder");
    await sendMessage('from_oracle', {
      body: JSON.stringify(order),
      conversationId: order.rfqId
    });

    res.status(200).json({ message: 'Send Order called on Kafka' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error calling Send Order function' });
  }
});

// Start the server
server.listen(3001, () => {
  console.log('Server is running on port 3001');
});

// Consume messages from Kafka topics
consumeMessages('from_citifixconnector', (data) => {
  console.log('Message received from from_citifixconnector:', data);
  let parsedData = JSON.parse(data.body);
  let client = findInMap(parsedData.rfqId, rfqs);
  if (client) {
    let ws = findInMap(client, clients);
    if (ws) {
      ws.emit('oracleUpdate', parsedData);
    } else {
      console.log(`Cannot find websocket for client ${client}`);
    }
  } else {
    console.log(`Cannot find client for rfq ${parsedData.rfqId}`);
  }
});

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

function registerEvent(_name, _id, _description) {
  const _clientTime = new Date().toISOString();
  const eventData = {
    module: "UI Server",
    clientTime: _clientTime,
    name: _name,
    id: _id,
    description: _description
  };

  axios.post('http://' + eventHostId + ':' + eventHostPort + '/registerEvent', eventData)
    .then(() => console.log('Event registered successfully'))
    .catch(() => console.error('Failed to register event - is the server running?'));
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
