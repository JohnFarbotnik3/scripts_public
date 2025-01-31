cd */

mkdir "../TEMP"
mv * "../TEMP"

extraargs="--recursive"
unusedargs="-printValues"
let isec=10
let iter=12*3600
dir_e="../TEMP"
dir_c="./text"
dir_v="./video"
let movszmin=0				#1 byte
let movszmax=1024*1024*1  	#1   MB
let cpyszmin=1				#1 byte
let cpyszmax=1024*1024*100	#100 MB
let dirszmax=1024*1024*250	#250 MB
let itemsmax=3000
/home/usera/Workspace/Scripts/Cpp/FileSorter/Sorter "move" "$dir_e" "$dir_c" "$dir_c" "-sizeRange" $movszmin $movszmax "-dirLimits" $dirszmax $itemsmax $extraargs
/home/usera/Workspace/Scripts/Cpp/FileSorter/Sorter "move" "$dir_e" "$dir_v" "$dir_v" "-sizeRange" $cpyszmin $cpyszmax "-dirLimits" $dirszmax $itemsmax $extraargs

dir_src="./"
/home/usera/Workspace/Scripts/Cpp/FileSorter/DirectoryRenamer "rc" "$dir_src/../"
/home/usera/Workspace/Scripts/Cpp/FileSorter/DirectoryRenamer "rc" "$dir_src/../"

rm -d "../TEMP"

