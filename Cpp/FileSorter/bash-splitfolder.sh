extraargs="--recursive"
dirsrc="$1"
dirdst="$1/split"
dircmp="$1/split"
let movszmin=1				#1 byte
let movszmax=1024*1024*100	#100 MB
let dirszmax=1024*1024*250	#250 MB
let itemsmax=3000
./Sorter "move" "$dirsrc" "$dirdst" "$dircmp" "-sizeRange" $movszmin $movszmax "-dirLimits" $dirszmax $itemsmax $extraargs

