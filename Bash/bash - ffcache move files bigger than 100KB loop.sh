i=0
while [ $i -lt 20 ]
do
	src="/dev/shm/firefox/entries"
	dst="./entries_$(date +%Y-%m-%d-%H-%M-%S)/"
	mkdir -m 0770 $dst
	find "$src" -type f -size +100k -exec mv {} "$dst" \;
	echo "$dst"
	i=$(($i + 1))
	sleep 2700.0
done
