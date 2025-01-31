i=0
while [ $i -lt 20 ]
do
	mv /dev/shm/firefox/entries ./entries_$(date +%Y-%m-%d-%H-%M-%S)
	mkdir -m 0770 /dev/shm/firefox/entries
	output=$(date +%Y-%m-%d-%H-%M-%S)
	echo "$output"
	i=$(($i + 1))
	sleep 2700.0
done
