/*
build:
	g++ -o "./concat-segments" "./concat-segments.cpp"
run:
	BASEPATH="/dev/shm/downloads/videos/concat" && \
	./concat-segments "${BASEPATH}/input" "${BASEPATH}/output" "${BASEPATH}/temp" "${BASEPATH}/done" "_video" "_audio"
*/

#include <cstdio>
#include <filesystem>
#include "./concat-segments_utils.cpp"

using namespace std;
using Path = std::filesystem::path;
using String = std::string;

int main(const int argc, const char** argv) {
	// parse input arguments.
	printf("\n");
	for(int x=0;x<argc;x++) printf("argv[%i]: %s\n", x, argv[x]);
	if(argc < 6) {
		printf("\n");
		printf("this program takes an input directory containing video and audio segments\n");
		printf("(each having the same filename and substring, but different suffix),\n");
		printf("finds filenames containing some substring, then concatenates them into a single file.\n");
		printf("NOTE: they will be concatenated in alphabetical order, which is what the suffix is for.\n");
		printf("REMINDER: this program is for operating on segments of *one video at a time*.\n");
		printf("\n");
		printf("expected input filename format:\n");
		printf("FILENAME_SUBSTRING_SUFFIX.EXT\n");
		printf("output filename format:\n");
		printf("FILENAME\n");
		printf("\n");
		printf("command:\n");
		printf("concat-segments <dir_input> <dir_output> <dir_temp> <dir_done> <video_substring> <audio_substring>\n");
		printf("\n");
	}
	Path dir_in  (argv[1]);
	Path dir_out (argv[2]);
	Path dir_temp(argv[3]);
	Path dir_done(argv[4]);
	String video_substr(argv[5]);
	String audio_substr(argv[6]);
	filesystem::remove_all(dir_temp);
	mkdir(dir_in);
	mkdir(dir_out);
	mkdir(dir_temp);
	mkdir(dir_done);
	
	// Get all paths in input folder.
	std::vector<Path> input_paths = getPathsInDirectory(dir_in);
	// Get filename part of first path.
	if(input_paths.size() < 1) { printf("ERROR: input_paths.size is < 1\n"); return 1; }
	String common_name = "";
	{
		String str = input_paths[0].filename().string();
		String str_v = getPartBeforeSubstring(str, video_substr);
		String str_a = getPartBeforeSubstring(str, audio_substr);
		const int len = min(str_v.length(), str_a.length());
		common_name = str.substr(0, len);
	}
	printf("common file name: '%s'\n", common_name.c_str());
	// copy files to temp-dir, generating lists and renaming according to the following format:
	// from:	"FILENAME_SUBSTRING_SUFFIX.EXT"
	// to:		"temp_SUBSTRING_SUFFIX.EXT"
	std::vector<Path> video_paths = getPathsSorted(getPathsFiltered(getPathsFiltered(input_paths, video_substr), common_name));
	std::vector<Path> audio_paths = getPathsSorted(getPathsFiltered(getPathsFiltered(input_paths, audio_substr), common_name));
	std::string video_list_names = "";
	std::string audio_list_names = "";
	if(video_paths.size() < 1) { printf("ERROR: video_paths.size is < 1\n"); return 1; }
	if(audio_paths.size() < 1) { printf("ERROR: audio_paths.size is < 1\n"); return 1; }
	for(Path path : video_paths) {
		String temp_name = replaceAll(path.filename().string(), common_name, "temp_video_");
		Path   temp_path = appendFilename(dir_temp, temp_name);
		video_list_names.append("file ").append(temp_path.string()).append("\n");
		replaceFile(path, temp_path);
	}
	for(Path path : audio_paths) {
		String temp_name = replaceAll(path.filename().string(), common_name, "temp_audio_");
		Path   temp_path = appendFilename(dir_temp, temp_name);
		audio_list_names.append("file ").append(temp_path.string()).append("\n");
		replaceFile(path, temp_path);
	}
	printf("video_list_names:\n%s\n", video_list_names.c_str());
	printf("audio_list_names:\n%s\n", audio_list_names.c_str());
	Path video_list_file(appendFilename(dir_temp, "video_list.txt"));
	Path audio_list_file(appendFilename(dir_temp, "audio_list.txt"));
	filesystem::remove(video_list_file);
	filesystem::remove(audio_list_file);
	writeFile(video_list_file, video_list_names);
	writeFile(audio_list_file, audio_list_names);
	
	// concatenate segments in each list
	String video_file_ext = video_paths[0].extension().string();
	String audio_file_ext = audio_paths[0].extension().string();
	Path concat_video_path = appendFilename(dir_temp, String("concat_video").append(video_file_ext));
	Path concat_audio_path = appendFilename(dir_temp, String("concat_audio").append(audio_file_ext));
	char cmdstr[1024];
	snprintf(cmdstr, 1024, "ffmpeg -y -f concat -safe 0 -i '%s' -c copy '%s'", video_list_file.c_str(), concat_video_path.c_str());
	printf("running ffmpeg, concat output: %s\n", concat_video_path.c_str());
	system(cmdstr);
	snprintf(cmdstr, 1024, "ffmpeg -y -f concat -safe 0 -i '%s' -c copy '%s'", audio_list_file.c_str(), concat_audio_path.c_str());
	printf("running ffmpeg, concat output: %s\n", concat_audio_path.c_str());
	system(cmdstr);
	
	// combine video and audio
	String combined_media_ext = video_file_ext;// TODO: generalize - some containers cant hold certain types of audio!
	Path   combined_media_path = appendFilename(dir_temp, String("combined").append(combined_media_ext));
	Path     output_media_path = appendFilename(dir_out, String(common_name).append(combined_media_ext));
	snprintf(cmdstr, 1024,
		//"ffmpeg -y -i '%s' -i '%s' -c:v copy -c:a copy -map 0:v:0 -map 1:a:0 '%s'",
		"ffmpeg -y -i '%s' -i '%s' -c:v copy -c:a copy '%s'",
		concat_video_path.c_str(),
		concat_audio_path.c_str(),
		combined_media_path.c_str()
	);
	printf("running ffmpeg, combined output: %s\n", combined_media_path.c_str());
	system(cmdstr);
	replaceFile(combined_media_path, output_media_path);
	
	// move files to "done" folder
	for(Path path : video_paths) { Path dst = Path(dir_done).append(path.filename().string()); moveFile(path, dst); }
	for(Path path : audio_paths) { Path dst = Path(dir_done).append(path.filename().string()); moveFile(path, dst); }
}



