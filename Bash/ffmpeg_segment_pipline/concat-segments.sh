here="/home/usera/Workspace/Scripts/Bash/ffmpeg_segment_pipline"
logd="/dev/shm/downloads/$(date +%Y-%m-%d)_logs"
mkdir "${logd}"
 idir="/media/usera/VM_Storage_480GB/Temporary_Files/video-pipline/convert_output"
iqdir="/media/usera/VM_Storage_480GB/Temporary_Files/video-pipline/convert_output_metadata"
odir="/media/usera/VM_Storage_480GB/Temporary_Files/video-pipline/concat_output"
tdir="/dev/shm/downloads/videos/concat_temp"
ddir="/media/usera/VM_Storage_480GB/Temporary_Files/video-pipline/concat_done"
i=0
while [ $i -lt 300 ]
do
	logf="${logd}/ffmpeg-concat_log_$(date +%Y-%m-%d-%H-%M-%S).txt"
	"${here}/concat-segments" "${idir}" "${odir}" "${tdir}" "${ddir}" "_video" "_audio" 2>&1 | tee "${logf}"
	sleep 2
	i=$((i+1))
done

