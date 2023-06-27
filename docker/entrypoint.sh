#!/bin/bash
# give chance to dlt to be initialized
#echo WAITING FOR DLT TO BE INITIALIZED....
#sleep 30

# Start Hardhat node in the background
node app.js


# Keep the container running
tail -f /dev/null