if [ "$1" ]; then sleep_time=$1; else echo "no sleep time specified!" && exit 1; fi;
while : ; do
    output=$(sensors)
    clear
    echo ""
    echo "$output"
    sleep "$sleep_time"
done

