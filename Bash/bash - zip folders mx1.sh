for i in */; do
    7z a "${i%/}.zip" "$i" -mx=1;
done
