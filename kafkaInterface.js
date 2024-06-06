// kafkaInterface.js
const { Kafka, logLevel } = require('kafkajs');

const kafkaHostIp = process.env.KAFKAHOSTIP || 'localhost';
const kafkaHostPort = process.env.KAFKAHOSTPORT || '9092';

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: [`${kafkaHostIp}:${kafkaHostPort}`],
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 300, // Initial retry time in ms
    retries: 10 // Number of retries
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'test-group' });

const connectWithRetry = async (connectFn, retries = Infinity, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log("kafka ip:port:", kafkaHostIp, ":", kafkaHostPort)        
      await connectFn();
      console.log('Kafka connected successfully');
      return;
    } catch (error) {
      console.error(`Failed to connect to Kafka, retrying in ${delay / 1000} seconds...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const connectProducer = () => connectWithRetry(() => producer.connect());
const connectConsumer = () => connectWithRetry(() => consumer.connect());

const sendMessage = async (topic, message) => {
  try {
    await producer.send({
      topic: topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log('Message sent to Kafka:', message);
  } catch (error) {
    console.error('Failed to send message to Kafka:', error);
  }
};

const consumeMessages = async (topic, callback) => {
  try {
    await consumer.subscribe({ topic: topic, fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        callback(JSON.parse(message.value.toString()));
      },
    });
  } catch (error) {
    console.error('Failed to consume messages from Kafka:', error);
  }
};

module.exports = {
  connectProducer,
  connectConsumer,
  sendMessage,
  consumeMessages
};
