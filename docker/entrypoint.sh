#!/bin/bash
# Export environment variables for Kafka
export KAFKAHOSTIP=${KAFKAHOSTIP}
export KAFKAHOSTPORT=${KAFKAHOSTPORT}

# Start the Node.js application
node app.js

# Keep the container running
tail -f /dev/null