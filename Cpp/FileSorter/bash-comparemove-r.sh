extraargs="-printValues --recursive"
dirsrc="$1"
dirdst="$1/diff"
dircmp="$2"
./Sorter "move" "$dirsrc" "$dirdst" "$dircmp" $extraargs
# note: you may need to use echo when reading variables with spaces

