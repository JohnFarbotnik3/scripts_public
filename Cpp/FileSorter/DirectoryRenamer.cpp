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

void operationRC(Path pathSrc, int depth=0) {
	if(!std::filesystem::is_directory(pathSrc)) return;
	vector<Entry> arr = getEntries(pathSrc);
	for(auto const& entry : arr) {
		if(entry.is_directory()) operationRC(entry.path(), depth+1);
	}
	if(depth <= 0) return;
	for(auto const& entry : arr) {
		if(entry.is_directory()) {
			// ignore empty directories
			Path oldPath = entry.path();
			bool hasfiles = false;
			for(auto const& e : getEntriesRecursive(oldPath))
				if(e.is_regular_file()) { hasfiles=true; break; }
			if(!hasfiles) continue;
			// rename
			string strPath = oldPath.string();
			// ignore saved pages
			if(strPath.find("_files") < strPath.length()) continue;
			strPath[strPath.find_last_of('/')] = '_';
			Path newPath = Path(strPath);
			printPath("rename: ", oldPath, "\n");
			printPath("   -->: ", newPath, "\n");
			std::filesystem::rename(oldPath, newPath);
		}
	}
}

int main(int argc, char** argv) {
	printMult("-~-", 20, "\n");
	// print given arguments
	if(getArgExists(argc, argv, "-printArgs")) printArgs(argc, argv);
	// print help
	if(argc < 2 || getArgExists(argc, argv, vector<string>{"-h", "--help"})) {
		printf("usage:\n");
		printf("./Renamer <mode {rc|recursive-concantenate}>");
		printf(" <pathsrc>\n");
		printf("\t[-h|--help]\n");
		printf("\t[-printArgs]\n");
		printf("\t[-printValues]\n");
		return 1;
	}
	// get mandatory arguments
	string self = string(argv[0]);
	string mode = string(argv[1]);
	Path pathsrc(argv[2]);
	// print values
	if(getArgExists(argc,argv,"-printValues")) {
		printf("mode: %s\n", mode.c_str());
		printPath("pathsrc: ", pathsrc, "\n");
	}
	// make sure required directories exist
	if(!is_directory(pathsrc)) {
		printf("ERROR: pathsrc is not directory! (%s)\n", pathsrc.string().c_str());
		return 3;
	}
	// perform operation
	if(mode=="rc" || mode =="recursive-concantenate")
		operationRC(pathsrc);
}



