# Get the current date
current_date=$(date)

echo "Run at: $current_date"

docker build -t rfsserver .

current_date=$(date)
echo "Finished at: $current_date"