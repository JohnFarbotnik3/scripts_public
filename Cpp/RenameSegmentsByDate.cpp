#include "./Utils/FileIO.hpp"
#include <cstring>
#include <algorithm>

/*
BUILD:
	g++ -o "./RenameSegmentsByDate" "./RenameSegmentsByDate.cpp"
RUN:
	"./RenameSegmentsByDate" <dir>
*/
// TODO - build safety into this code: DO NOT TARGET ANY DIRECTORY THAT IS NOT UNDER "/dev/shm" 
int main(int argc, char** argv) {
	// print arguments.
	for(int x=0;x<argc;x++) {
		string str = string(argv[x]);
		printf("argv[%i]: %s\n", x, str.c_str());
	}
	
	// process arguments.
	if(argc <= 1) printf("missing: dir\n");
	Path dir = Path(argv[1]);
	
	// get all files between in directory.
	std::vector<Path> paths;
	if(std::filesystem::is_directory(dir)) {
		vector<Entry> src_entries = getEntriesRecursive(dir);
		for(const auto entry : src_entries) {
			if(entry.is_regular_file()) paths.push_back(entry.path());
		}
	} else {
		printf("'%s' is not a directory!\n", dir.c_str());
		return 1;
	}
	
	// sort paths by date modified.
	struct {
		bool operator()(Path a, Path b) const {
			const std::filesystem::file_time_type ta = std::filesystem::last_write_time(a);
			const std::filesystem::file_time_type tb = std::filesystem::last_write_time(b);
			return ta < tb;
		}
	} dateLessThan;
	std::sort(paths.begin(), paths.end(), dateLessThan);
	
	// rename files based on order.
	int num = 0;
	for(const Path& path : paths) {
		char buf[256];
		sprintf(buf, "%i.ts", num++);
		const Path new_path(path.parent_path() / std::string(buf));
		std::filesystem::rename(path, new_path);
	}
}

