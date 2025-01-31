
echo "=============================="
temp_val=0
if [ "$1" ]; then temp_val=0; else echo "no input   directory specified!" && exit 1; fi;
if [ "$2" ]; then temp_val=0; else echo "no output  directory specified!" && exit 1; fi;
if [ "$3" ]; then temp_val=0; else echo "no done    directory specified!" && exit 1; fi;
if [ "$4" ]; then temp_val=0; else echo "no working directory specified!" && exit 1; fi;
if [ "$5" ]; then temp_val=0; else echo "no input  metadata directory specified!" && exit 1; fi;
if [ "$6" ]; then temp_val=0; else echo "no output metadata directory specified!" && exit 1; fi;
ifdir="$1"
ofdir="$2"
iqdir="$5"
oqdir="$6"
donedir="$3"
workdir="$4"
FILE=$ofdir;	if [ ! -e $FILE ]; then mkdir -p $FILE; fi;
FILE=$donedir;	if [ ! -e $FILE ]; then mkdir -p $FILE; fi;
FILE=$workdir;	if [ ! -e $FILE ]; then mkdir -p $FILE; fi;
FILE=$oqdir;	if [ ! -e $FILE ]; then mkdir -p $FILE; fi;

# count number of files
search_str="_media"
file_count=$(ls "${ifdir}" | grep -c "$search_str")
if [ "${file_count}" == "0" ];
then
	sleep_time=60
	echo "no media files found, waiting $sleep_time seconds...";
	sleep $sleep_time;
	exit 1;
else
	echo "media file count: ${file_count}";
fi

# get first file
fname=$(ls -t -r "${ifdir}" | grep -m 1 "$search_str")
echo "first media file: ${vf_name}";

# paths
ifpath="${ifdir}/${fname}"
ofpath="${ofdir}/${fname}"
iqpath="${iqdir}/${fname}.txt"
oqpath="${oqdir}/${fname}.txt"
donepath="${donedir}/${fname}"
workpath="${workdir}/${fname}"
workfile_v="${workdir}/video_${fname}"
workfile_a="${workdir}/audio_${fname}"

# move file to working directory
mv "${ifpath}" "${workpath}"
ifpath="${workpath}"

# get the amount of time to remove from start of this media segment.
# this is because sometimes extra frames are recorded when
# the next recorder starts before the previous has stopped.
# ^ update: I now do this on purpose.
dt_beg_offset="0.001" # TODO: set to 0 if this is the first media segment
 t_beg=$(sed -n '3p' < "${iqpath}")
dt_beg=$(sed -n '6p' < "${iqpath}")
# TODO: write a program for evaluating math & logic statements...
#if [ $t_beg -eq "0" ]; then dt_beg_offset="0.001"; else dt_beg_offset="0"; fi

#seek_start=$(awk "BEGIN { sum = $dt_beg + $dt_beg_offset; print sum; exit; };")
seek_start=$dt_beg

echo "t_beg: ${t_beg}"
echo "dt_beg: ${dt_beg}"
echo "dt_beg_offset: ${dt_beg_offset}"
echo "seek_start: ${seek_start}"
# ^ NOTES:
# - "awk" is used for floating point arithmetic, since bash refuses to evaluate that.
# - 0.001 is added so that this (hopefully) starts exactly 1 frame after previous segment.

# ============================================================
# re-encode audio
# ------------------------------------------------------------

new_audio_codec="libopus"
new_audio_format="opus"

bitrate_num="192"
bitrate_tgt="$(($bitrate_num * 100/100))K"
bitrate_min="$(($bitrate_num *  50/100))K"
bitrate_max="$(($bitrate_num * 150/100))K"

fname_input="${ifpath}"
fname_output="${workfile_a}"

echo "------------------------------"
echo "fname_input : $fname_input"
echo "fname_output: $fname_output"
echo "new_audio_codec: $new_audio_codec"
echo "bitrate_tgt: $bitrate_tgt"
echo "bitrate_min: $bitrate_min"
echo "bitrate_max: $bitrate_max"

ffmpeg -i "$fname_input" -map 0:a \
-ss "$seek_start" \
-b:a "$bitrate_tgt" -minrate "$bitrate_min" -maxrate "$bitrate_max" \
-c:a "$new_audio_codec" -f "$new_audio_format" -y "$fname_output"

# TODO: solve audio glitch problem.
#-shortest -avoid_negative_ts make_zero -fflags +genpts \

# ============================================================
# re-encode video
# ------------------------------------------------------------

# get info about file
info_format=$(  ffprobe -i "${ifpath}" -loglevel "quiet" -print_format "json" -show_format)
info_astreams=$(ffprobe -i "${ifpath}" -loglevel "quiet" -print_format "json" -show_streams -select_streams a)
info_vstreams=$(ffprobe -i "${ifpath}" -loglevel "quiet" -print_format "json" -show_streams -select_streams v)
info_vstream=$(echo $info_vstreams | jq -r ".streams[0]")
info_vstream_wid=$(echo $info_vstream | jq -r ".width")
info_vstream_hgt=$(echo $info_vstream | jq -r ".height")
info_vstream_fps=$(echo $info_vstream | jq -r ".avg_frame_rate")
info_vstream_cdc=$(echo $info_vstream | jq -r ".codec_name")
info_vstream_cdt=$(echo $info_vstream | jq -r ".codec_type")

echo $info_format | jq -r ""
echo $info_vstreams | jq -r ""
echo $info_astreams | jq -r ""
echo "vstream:"
echo $info_vstream | jq -r ""

# decide new encoding parameters
echo "------------------------------"
echo "codec: ${info_vstream_cdc}"
echo "type : ${info_vstream_cdt}"
echo "wid:$info_vstream_wid, hgt:$info_vstream_hgt, fps:$info_vstream_fps=$((info_vstream_fps))"

echo "------------------------------"

hgt=$info_vstream_hgt
wid=$info_vstream_wid
fps=$((info_vstream_fps))

rate_mult_fps="160/100"
if [                $fps -le 20 ]; then rate_mult_fps="70/100"; fi;
if [ 20 -lt $fps -a $fps -le 27 ]; then rate_mult_fps="90/100"; fi;
if [ 27 -lt $fps -a $fps -le 40 ]; then rate_mult_fps="100/100"; fi;
if [ 40 -lt $fps -a $fps -le 50 ]; then rate_mult_fps="130/100"; fi;
if [ 50 -lt $fps -a $fps -le 70 ]; then rate_mult_fps="160/100"; fi;
if [ 70 -lt $fps -a $fps -le 99 ]; then rate_mult_fps="200/100"; fi;
if [ 99 -lt $fps                ]; then rate_mult_fps="250/100"; fi;

rate_mult_hgt="1200"
if [                  $hgt -le  360 ]; then rate_mult_hgt="300"; fi;
if [  360 -lt $hgt -a $hgt -le  480 ]; then rate_mult_hgt="750"; fi;
if [  480 -lt $hgt -a $hgt -le  640 ]; then rate_mult_hgt="900"; fi;
if [  640 -lt $hgt -a $hgt -le  720 ]; then rate_mult_hgt="1200"; fi;
if [  720 -lt $hgt -a $hgt -le 1080 ]; then rate_mult_hgt="2000"; fi;
if [ 1080 -lt $hgt -a $hgt -le 1440 ]; then rate_mult_hgt="6000"; fi;
if [ 1440 -lt $hgt -a $hgt -le 2160 ]; then rate_mult_hgt="12000"; fi;
if [ 2160 -lt $hgt                  ]; then rate_mult_hgt="20000"; fi;

crf_value="10"
if [ $hgt -ge  240 ]; then crf_value="37"; fi;
if [ $hgt -ge  360 ]; then crf_value="36"; fi;
if [ $hgt -ge  480 ]; then crf_value="33"; fi;
if [ $hgt -ge  640 ]; then crf_value="32"; fi;
if [ $hgt -ge  720 ]; then crf_value="32"; fi;
if [ $hgt -ge 1080 ]; then crf_value="31"; fi;
if [ $hgt -ge 1440 ]; then crf_value="24"; fi;
if [ $hgt -ge 2160 ]; then crf_value="15"; fi;

thread_count="4"
if [ $wid -ge   320 ]; then thread_count="2"; fi; #default 2
if [ $wid -ge   640 ]; then thread_count="3"; fi; #default 4
if [ $wid -ge   900 ]; then thread_count="3"; fi; #default 4
if [ $wid -ge  1280 ]; then thread_count="3"; fi; #default 8
if [ $wid -ge  1920 ]; then thread_count="3"; fi; #default 8

quality_val="good"
kframe_spacing="240"

new_video_codec="libvpx-vp9" #"vp9"
new_video_format="webm"

fname_input="${ifpath}"
fname_output="${workfile_v}"

bitrate_num="$(($rate_mult_hgt * $rate_mult_fps))"
bitrate_tgt="$(($bitrate_num *  107/100))K"
bitrate_min="$(($bitrate_num *   50/100))K"
bitrate_max="$(($bitrate_num * 9999/100))K"
# NOTES:
# - Max bitrate is set very high so that first few frames can get a bunch
# 	of extra encoding headroom, that way they are not so blocky.
# - Hopefully this hack doesnt cause rest of video to become oversized.
# - This also leads to very large keyframes,
# 	so I have given target bitrate a slightly higher multiplier to compensate.

echo "fname_input: $fname_input"
echo "fname_output: $fname_output"
echo "new_video_codec: $new_video_codec"
echo "fps: $fps, fps mult: ${rate_mult_fps}"
echo "hgt: $hgt, hgt mult: ${rate_mult_hgt}K"
echo "bitrate: $bitrate_tgt"
echo "minrate: $bitrate_min"
echo "maxrate: $bitrate_max"
echo "keyframe spacing: $kframe_spacing"
echo "threads: $thread_count"
echo "quality: $quality_val"
echo "crf: $crf_value"

ffmpeg -i "$fname_input" -map 0:v \
-ss "$seek_start" \
-b:v "$bitrate_tgt" -minrate "$bitrate_min" -maxrate "$bitrate_max" \
-g "$kframe_spacing" -row-mt "1" -threads "$thread_count" -quality "$quality_val" -crf "$crf_value" \
-c:v "$new_video_codec" -f "$new_video_format" -y "$fname_output"

# TODO: solve audio glitch problem.
#-shortest -avoid_negative_ts make_zero -fflags +genpts \

# ============================================================
# combine audio and video
# ------------------------------------------------------------

container_format="webm"
ffmpeg -y -i "${workfile_v}" -i "${workfile_a}" -c:v copy -c:a copy -f "$container_format" "${ofpath}"
rm "${workfile_v}"
rm "${workfile_a}"

# copy metadata to output directory
cp "${iqpath}" "${oqpath}"

# move input file to "done" folder
mv "${ifpath}" "${donepath}"
echo "------------------------------"



