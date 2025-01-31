#include <cstdio>
#include <iostream>
#include <string>
#include <chrono>
#include <thread>
#include <algorithm>
#include <set>
#include "../Utils/CommandLineUtils.hpp"
#include "../Utils/FileIO.hpp"

using std::string;

vector<Entry> getFilteredBase(Path pathSrc, Path pathDst, Path pathCmp, bool recursive) {
	vector<Entry> arrSrc = recursive ? getEntriesRecursive(pathSrc) : getEntries(pathSrc);
	vector<Entry> arrDst = recursive ? getEntriesRecursive(pathDst) : getEntries(pathDst);
	vector<Entry> arrCmp = recursive ? getEntriesRecursive(pathCmp) : getEntries(pathCmp);
	arrSrc = filterByIsFile(arrSrc);
	arrSrc = filterByNotInList(arrSrc, arrDst);
	arrSrc = filterByNotInList(arrSrc, arrCmp);
	sortByDateModified(arrSrc);
	return arrSrc;
}

bool dirHasRoom(size_t dirItemMax, size_t dirSizeMax, size_t num, size_t sum, size_t nextFileSize) {
	return (
		(num + 1) <= dirItemMax &&
		(sum + nextFileSize) <= dirSizeMax
	);
}

Path getSubdirName(Path path, int n) {
	const int NUMLEN = 3;
	char buf[1024];
	sprintf(buf, "%s/%03i", path.string().c_str(), n);
	return Path(buf);
}
int getSubdirIndexHighest(Path path) {
	const int NUMLEN = 3;
	vector<Entry> arr = getEntries(path);
	int i = 0;
	for(auto const& entry : arr) {
		string str = entry.path().filename().string();
		if(str.length() == NUMLEN && isNumeric(str, 0, NUMLEN))
			i = std::max(i, toNumeric(str, 0, NUMLEN));
	}
	return i;
}
Path getNextSubdir(Path pathBase, bool recursive, size_t dirItemMax, size_t dirSizeMax, size_t nextFileSize) {
	if(!recursive) return pathBase;
	int n = getSubdirIndexHighest(pathBase);
	Path next = getSubdirName(pathBase, n);
	if(!exists(next)) createDir(next);
	size_t num = getTotalItems(next);
	size_t sum = getTotalSize(next);
	if(!dirHasRoom(dirItemMax, dirSizeMax, num, sum, nextFileSize)) {
		n++;
		next = getSubdirName(pathBase, n);
		if(!exists(next)) createDir(next);
	}
	return next;
}

// print list of files that are in src but not in dst or cmp 
void diffFiles(Path pathSrc, Path pathDst, Path pathCmp, bool recursive) {
	vector<Entry> arr = getFilteredBase(pathSrc, pathDst, pathCmp, recursive);
	printMult("-", 30, "\n");
	printPath("files unique to ", pathSrc, ":\n");
	for(auto const& entry : arr) printPath("", entry.path(), "\n");
}

// copy files from src to dst, unless file with matching name is in dst or cmp 
void copyFiles(
	Path pathSrc, Path pathDst, Path pathCmp, bool recursive,
	size_t dirItemMax, size_t dirSizeMax,
	size_t sizeMin, size_t sizeMax
) {
	vector<Entry> arr = getFilteredBase(pathSrc, pathDst, pathCmp, recursive);
	arr = filterByFileSize(arr, sizeMin, sizeMax);
	Path dst = getNextSubdir(pathDst, recursive, dirItemMax, dirSizeMax, 0);
	size_t num = getTotalItems(dst);
	size_t sum = getTotalSize(dst);
	for(auto const& entry : arr) {
		if(!entry.is_regular_file()) continue;
		size_t nextFileSize = entry.file_size();
		if(!dirHasRoom(dirItemMax, dirSizeMax, num, sum, nextFileSize)) {
			dst = getNextSubdir(pathDst, recursive, dirItemMax, dirSizeMax, nextFileSize);
			num = 0;
			sum = 0;
		}
		num += 1;
		sum += entry.file_size();
		copyFile(entry.path(), dst/entry.path().filename());
	}
}

// sort files from src to dst, unless file with matching name is in dst or cmp
void moveFiles(
	Path pathSrc, Path pathDst, Path pathCmp, bool recursive,
	size_t dirItemMax, size_t dirSizeMax,
	size_t sizeMin, size_t sizeMax
) {
	vector<Entry> arr = getFilteredBase(pathSrc, pathDst, pathCmp, recursive);
	arr = filterByFileSize(arr, sizeMin, sizeMax);
	Path dst = getNextSubdir(pathDst, recursive, dirItemMax, dirSizeMax, 0);
	size_t num = getTotalItems(dst);
	size_t sum = getTotalSize(dst);
	for(auto const& entry : arr) {
		if(!entry.is_regular_file()) continue;
		size_t nextFileSize = entry.file_size();
		if(!dirHasRoom(dirItemMax, dirSizeMax, num, sum, nextFileSize)) {
			dst = getNextSubdir(pathDst, recursive, dirItemMax, dirSizeMax, nextFileSize);
			num = 0;
			sum = 0;
		}
		num += 1;
		sum += entry.file_size();
		moveFile(entry.path(), dst/entry.path().filename());
	}
}

/* TODO:
- re-arrange argument order (put sizemin,sizemax at end)
- add date-time filter (datemin,datemax) which takes strings of form "yyyy-mm-dd_hh-mm-ss"
- make size and date parameters use default values if "-1" is given for an argument
/*
example usage:
./Main c "./A" "./B" "./C" 100 10000 20000 5
./Main m "./B" "./C" "./C" 100 10000 20000 5
*/
int main(int argc, char** argv) {
	printMult("-~-", 20, "\n");
	// print given arguments
	if(getArgExists(argc, argv, "-printArgs")) printArgs(argc, argv);
	// print help
	if(argc < 5 || getArgExists(argc, argv, vector<string>{"-h", "--help"})) {
		printf("usage:\n");
		printf("./Main <mode {d|diff, c|copy, m|move}>");
		printf(" <pathsrc> <pathdst> <pathcmp>\n");
		printf("\t[-dirLimits <dirMaxTotalBytes> <dirMaxTotalItems>]\n");
		printf("\t[-sizeRange <fileSizeMin> <fileSizeMax>]\n");
		//TODO: implement filtering by time last written
		//printf("\t[-dateRange <fileDateMin> <fileDateMax>]\n");
		printf("\t[-h|--help]\n");
		printf("\t[-r|--recursive]\n");
		printf("\t[-printArgs]\n");
		printf("\t[-printValues]\n");
		return 1;
	}
	// get mandatory arguments
	string self = string(argv[0]);
	string mode = string(argv[1]);
	Path pathsrc(argv[2]);
	Path pathdst(argv[3]);
	Path pathcmp(argv[4]);
	// get optional arguments
	const size_t size_1GB = 1024*1024*1024;
	string str_dirLimits = "-dirLimits";
	size_t dirSizeMax = getArgInt(argc, argv, str_dirLimits, 1, size_1GB * 1000);
	size_t dirItemMax = getArgInt(argc, argv, str_dirLimits, 2, 1000000);
	string str_sizeRange = "-sizeRange";
	size_t sizeMin = getArgInt(argc, argv, str_sizeRange, 1, 0);
	size_t sizeMax = getArgInt(argc, argv, str_sizeRange, 2, size_1GB);
	bool recursive = getArgExists(argc, argv, vector<string>{"-r", "--recursive"});
	// print values
	if(getArgExists(argc,argv,"-printValues")) {
		printf("mode: %s\n", mode.c_str());
		printf("pathsrc: "); printPath("", pathsrc, "\n");
		printf("pathdst: "); printPath("", pathdst, "\n");
		printf("pathcmp: "); printPath("", pathcmp, "\n");
		printf("fileSizeMin: %lu\n", sizeMin);
		printf("fileSizeMax: %lu\n", sizeMax);
		printf("dirMaxTotalBytes: %lu\n", dirSizeMax);
		printf("dirMaxTotalItems: %lu\n", dirItemMax);
	}
	// make sure required directories exist
	if(!is_directory(pathsrc)) {
		printf("ERROR: pathsrc is not directory! (%s)\n", pathsrc.string().c_str());
		return 3;
	}
	createDir(pathdst);
	createDir(pathcmp);
	// perform operation
	if(mode=="d" || mode =="diff") diffFiles(pathsrc, pathdst, pathcmp, recursive);
	if(mode=="c" || mode =="copy") copyFiles(pathsrc, pathdst, pathcmp, recursive, dirItemMax, dirSizeMax, sizeMin, sizeMax);
	if(mode=="m" || mode =="move") moveFiles(pathsrc, pathdst, pathcmp, recursive, dirItemMax, dirSizeMax, sizeMin, sizeMax);
}






