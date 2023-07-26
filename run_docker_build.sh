# Get the current date
current_date=$(date)

echo "Run at: $current_date"

cp '../test-rfq-client-hardhat/artifacts/contracts/TestRFQRequestor.sol/TestRFQRequestor.json' ./contracts/
cp '../test-rfq-client-hardhat/artifacts/contracts/Oracle.sol/Oracle.json' ./contracts/
docker build -t rfsserver .
rm ./contracts/*

current_date=$(date)
echo "Finished at: $current_date"