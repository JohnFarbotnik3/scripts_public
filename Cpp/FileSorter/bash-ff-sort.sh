extraargs="--recursive"
unusedargs="-printValues"
let isec=10
let iter=12*3600
dir_e="/dev/shm/firefox/entries"
dir_c="/dev/shm/downloads/clips/cache"
dir_v="/dev/shm/downloads/clips/video"
let cpyszmin=1				#1 byte
let cpyszmax=1024*1024*100	#100 MB
let movszmin=1024*1024		#1 MB
let movszmax=1024*1024*100	#100 MB
let dirszmax=1024*1024*250	#250 MB
let itemsmax=3000
while [ $iter -gt 0 ]
do
	./Sorter "copy" "$dir_e" "$dir_c" "$dir_v" "-sizeRange" $cpyszmin $cpyszmax "-dirLimits" $dirszmax $itemsmax $extraargs
	./Sorter "move" "$dir_c" "$dir_v" "$dir_v" "-sizeRange" $movszmin $movszmax "-dirLimits" $dirszmax $itemsmax $extraargs
	echo ""
	let iter=$iter-$isec
	sleep $isec
done

