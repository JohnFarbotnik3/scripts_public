here="/home/usera/Workspace/Scripts/Bash"
ts_date=$(date +%Y-%m-%d)
ts_full=$(date +%Y-%m-%d-%H-%M-%S)
logd="/dev/shm/downloads/${ts_date}_logs_sensors"
logf="${logd}/sensors_${ts_full}.txt"
mkdir "${logd}"
params="0.5"
bash "${here}/sensor-loop.sh" "${params}" 2>&1 | tee "${logf}"

