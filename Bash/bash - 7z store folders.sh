for i in */; do 7z a "${i%/}.7z" "$i" -mx=0; done
