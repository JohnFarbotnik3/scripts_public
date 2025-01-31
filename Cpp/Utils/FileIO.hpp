#include <string>
#include <vector>
#include <set>
#include <filesystem>
#include <algorithm>

using std::vector;
using string = std::string;
using std::filesystem::exists;
using Path = std::filesystem::path;
using Entry = std::filesystem::directory_entry;

// ==============================
// list functions
// ==============================

vector<Entry> getEntries(Path path) {
	const auto options = std::filesystem::directory_options::skip_permission_denied;
	std::filesystem::directory_iterator iter(path, options);
	vector<Entry> arr;
	for(auto const& entry : iter) arr.push_back(entry);
	return arr;
}
vector<Entry> getEntriesRecursive(Path path) {
	const auto options = std::filesystem::directory_options::skip_permission_denied;
	std::filesystem::recursive_directory_iterator iter(path, options);
	vector<Entry> arr;
	for(auto const& entry : iter) arr.push_back(entry);
	return arr;
}
size_t getTotalItems(Path path) {
	std::filesystem::recursive_directory_iterator iter(path);
	size_t n = 0;
	for(auto const& entry : iter) n++;
	return n;
}
size_t getTotalSize(Path path) {
	std::filesystem::recursive_directory_iterator iter(path);
	size_t n = 0;
	for(auto const& entry : iter)
		if(entry.is_regular_file())
			n += entry.file_size();
	return n;
}
size_t getFileSize(Path path) {
	if(!std::filesystem::is_regular_file(path)) {
		printf("is not regular file! (%s)\n", path.string().c_str());
		return 0;
	}
	return std::filesystem::file_size(path);
}

// ==============================
// sorting functions
// ==============================
void sortByDateModified(vector<Entry> &arr) {
	std::sort(arr.begin(), arr.end(), [](Entry a, Entry b) {
		return b.last_write_time()
		     > a.last_write_time();
	});
}


// ==============================
// filter functions
// ==============================
vector<Entry> filterByIsFile(vector<Entry> arr) {
	vector<Entry> filtered;
	for(auto const& entry : arr) if(entry.is_regular_file()) filtered.push_back(entry);
	return filtered;
}
vector<Entry> filterByFileSize(vector<Entry> arr, size_t a, size_t b) {
	vector<Entry> filtered;
	for(auto const& entry : arr)
		if(entry.is_regular_file() && a <= entry.file_size() && entry.file_size() <= b)
			filtered.push_back(entry);
	return filtered;
}
vector<Entry> filterByNotInList(vector<Entry> arr, vector<Entry> list) {
	std::set<Path> set;
	for(auto const& entry : list) set.insert(entry.path().filename());
	vector<Entry> filtered;
	for(auto const& entry : arr) if(set.count(entry.path().filename()) == 0) filtered.push_back(entry);
	return filtered;
}

// ==============================
// print functions
// ==============================
void printPath(string beg, Path path, string end) {
	printf("%s%s%s", beg.c_str(), path.string().c_str(), end.c_str());
}

// ==============================
// file and directory operations
// ==============================
bool createDir(Path path) {
	if(exists(path)) return false;
	printf("createDir: %s\n", path.string().c_str());
	return std::filesystem::create_directories(path);
}
bool copyFile(Path src, Path dst) {
	printPath("copyFile: src=", src, "\n");
	printPath("          dst=", dst, "\n\n");
	auto wrtime = std::filesystem::last_write_time(src);
	bool status = std::filesystem::copy_file(src, dst);
	std::filesystem::last_write_time(dst, wrtime);// set timestamp of this file to same value as original
	return status;
}
bool moveFile(Path src, Path dst) {
	printPath("moveFile: src=", src, "\n");
	printPath("          dst=", dst, "\n\n");
	std::filesystem::rename(src, dst);
	return false;
}


