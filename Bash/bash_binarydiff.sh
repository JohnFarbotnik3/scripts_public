dir1="/home/usera/Storage/Downloads/Pics - Artists - Compressable"
dir2="/dev/shm/downloads/temp"
subdir=""
diff --brief --recursive --speed-large-files "${dir1}/${subdir}" "${dir2}/${subdir}"

