for i in */; do
    7z a "${i%/}.zip" "$i";
done
