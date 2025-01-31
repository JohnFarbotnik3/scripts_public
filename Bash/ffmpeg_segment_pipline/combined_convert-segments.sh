logd="/dev/shm/downloads/$(date +%Y-%m-%d)_logs"
mkdir -p "${logd}"
 idir="/dev/shm/downloads/videos/convert_input"
iqdir="/dev/shm/downloads/videos/convert_input_metadata"
wdir="/dev/shm/downloads/videos/convert_working"
mdir="/dev/shm/downloads/videos/convert_done"
 odir="/media/usera/VM_Storage_480GB/Temporary_Files/video-pipline/convert_output"
oqdir="/media/usera/VM_Storage_480GB/Temporary_Files/video-pipline/convert_output_metadata"
here="/home/usera/Workspace/Scripts/Bash/ffmpeg_segment_pipline"
i=0
while [ $i -lt 1000 ]
do
	logf="${logd}/ffmpeg-convert_video_log_$(date +%Y-%m-%d-%H-%M-%S).txt"
	bash "${here}/combined_convert-segments_media.sh" "$idir" "$odir" "$mdir" "$wdir" "$iqdir" "$oqdir" 2>&1 | tee "${logf}"
	sleep 1
	i=$((i+1))
done

