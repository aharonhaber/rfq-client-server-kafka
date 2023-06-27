cp '../test-rfq-client-hardhat/artifacts/contracts/TestRFQRequestor.sol/TestRFQRequestor.json' ./contracts/
cp '../test-rfq-client-hardhat/artifacts/contracts/Oracle.sol/Oracle.json' ./contracts/
docker build -t rfsserver .
rm ./contracts/*