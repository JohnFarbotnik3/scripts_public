src="/dev/shm/firefox/entries"
dst="./entries_$(date +%Y-%m-%d-%H-%M-%S)/"
mkdir -m 0770 $dst
find "$src" -type f -size +100k -exec mv {} "$dst" \;
