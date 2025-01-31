/*
build:
	g++ -o "./concat-segments" "./combined_concat-segments_v3.cpp"
run:
	BASEPATH="/dev/shm/downloads/medias/concat" && \
	./concat-segments "${BASEPATH}/input" "${BASEPATH}/output" "${BASEPATH}/temp" "${BASEPATH}/done" "_media"
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
	if(argc < 5) {
		printf("\n");
		printf("this program takes an input directory containing media segments\n");
		printf("(each having the same filename and substring, but different suffix),\n");
		printf("finds filenames containing some substring, then concatenates them into a single file.\n");
		printf("NOTE: they will be concatenated in alphabetical order, which is what the suffix is for.\n");
		printf("REMINDER: this program is for operating on segments of *one media at a time*.\n");
		printf("\n");
		printf("expected input filename format:\n");
		printf("FILENAME_SUBSTRING_SUFFIX.EXT\n");
		printf("output filename format:\n");
		printf("FILENAME\n");
		printf("\n");
		printf("command:\n");
		printf("concat-segments <dir_input> <dir_output> <dir_temp> <dir_done> <media_substring>\n");
		printf("\n");
	}
	Path dir_in  (argv[1]);
	Path dir_out (argv[2]);
	Path dir_temp(argv[3]);
	Path dir_done(argv[4]);
	String media_substr(argv[5]);
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
		String str_v = getPartBeforeSubstring(str, media_substr);
		common_name = str_v;
	}
	printf("common file name: '%s'\n", common_name.c_str());
	// copy files to temp-dir, generating lists and renaming according to the following format:
	// from:	"FILENAME_SUBSTRING_SUFFIX.EXT"
	// to:		"temp_SUBSTRING_SUFFIX.EXT"
	std::vector<Path> media_paths = getPathsSorted(getPathsFiltered(getPathsFiltered(input_paths, media_substr), common_name));
	std::string media_manifest = "";
	if(media_paths.size() < 1) {
		printf("ERROR: media_paths.size() < 1\n"); return 1;
	}
	for(int i=0;i<media_paths.size();i++) {
		const Path path = media_paths[i];
		// get temporary filename
		String temp_name = replaceAll(path.filename().string(), common_name, "temp_media_");
		Path   temp_path = appendFilename(dir_temp, temp_name);
		// add info to manifest
		media_manifest.append("file ").append(temp_path.string()).append("\n");
		// copy temporary media segment file to temp directory, replacing already existing file if any.
		replaceFile(path, temp_path);
	}
	printf("~~~~~ media_manifest: ~~~~~\n%s\n~~~~~ <-> ~~~~~\n", media_manifest.c_str());
	Path media_list_file(appendFilename(dir_temp, "media_list.txt"));
	filesystem::remove(media_list_file);
	writeFile(media_list_file, media_manifest);
	
	// concatenate segments in each list
	String media_file_ext = media_paths[0].extension().string();
	Path output_media_temp = appendFilename(dir_out, String("temp_result_concat_media").append(media_file_ext));
	Path output_media_path = appendFilename(dir_out, String(common_name).append(media_file_ext));
	char cmdstr[1024];
	snprintf(cmdstr, 1024, "ffmpeg -y -f concat -safe 0 -i '%s' -c copy '%s'", media_list_file.c_str(), output_media_temp.c_str());
	printf("running ffmpeg, concat output: %s\n", output_media_temp.c_str());
	system(cmdstr);
	moveFile(output_media_temp, output_media_path);
	
	// move files to "done" folder
	for(Path path : media_paths) { Path dst = Path(dir_done).append(path.filename().string()); moveFile(path, dst); }
}



