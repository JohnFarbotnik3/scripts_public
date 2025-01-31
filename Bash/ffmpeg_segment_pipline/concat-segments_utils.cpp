
#include <cstdio>
#include <fstream>
#include <filesystem>
#include <system_error>
#include <vector>
#include <algorithm>

using namespace std;
using Path = std::filesystem::path;
using String = std::string;

Path appendFilename(Path dir, String filename) {
	return Path(dir.string().append("/").append(filename));
}

void mkdir(Path path) {
	const char* str = path.c_str();
	if(filesystem::exists(path)) {
		printf("directory already exists: %s\n", str);
	} else {
		if(filesystem::create_directories(path)) printf("created directory: %s\n", str);
		else printf("failed to create directory: %s\n", str);
	}
}

void moveFile(Path from, Path to) {
	printf("move:\nsrc: %s\ndst: %s\n", from.c_str(), to.c_str());
	std:error_code ec;
	filesystem::copy(from, to, ec);
	if(ec.value()) printf("ERROR: %s\n\n", ec.message().c_str());
	else filesystem::remove(from);
}

void copyFile(Path from, Path to) {
	printf("copy:\nsrc: %s\ndst: %s\n", from.c_str(), to.c_str());
	std:error_code ec;
	filesystem::copy(from, to, ec);
	if(ec.value()) printf("ERROR: %s\n\n", ec.message().c_str());
}

void replaceFile(Path from, Path to) {
	filesystem::remove(to);// remove old file, if any
	copyFile(from, to);
}

void writeFile(Path path, String text) {
	std::ofstream outfile(path.string(), std::ios::binary);
	if(outfile.is_open()) {
		printf("writing text to file: %s\n", path.c_str());
		outfile.write(text.c_str(), text.length());
		outfile.close();
	} else {
		printf("ERROR: failed to open file: %s\n", path.c_str());
	}
}

std::vector<Path> getPathsInDirectory(Path dir) {
	filesystem::directory_iterator iter(dir);
	std::vector<Path> paths;
	for(Path path : iter) paths.push_back(path);
	return paths;
}

std::vector<Path> getPathsFiltered(std::vector<Path> paths, String substr) {
	std::vector<Path> filtered;
	for(Path path : paths) if(path.string().find(substr) != String::npos) filtered.push_back(path);
	return filtered;
}

std::vector<Path> getPathsSorted(std::vector<Path> paths) {
	std::vector<Path> sorted;
	for(Path path : paths) {
		int i=sorted.size();
		for(int x=0;x<sorted.size();x++) if(path.string().compare(sorted[x].string()) < 0) { i=x; break; }
		auto iter = sorted.begin();
		sorted.insert(iter+i, path);
	}
	return sorted;
}

String replaceAll(String str, String old_str, String new_str) {
	if(old_str.length() < 1) {
		printf("ERROR: replaceAll() requires old_str with length > 0\n");
		return str;
	}
	int i = 0;
	while((i=str.find(old_str, i)) != String::npos) {
		str.replace(i, old_str.length(), new_str);
	}
	return str;
}

String getPartBeforeSubstring(String str, String sub) {
	const int pos = str.find(sub, 0);
	if(pos == std::string::npos) return str;
	const int beg = 0;
	const int len = pos;
	return str.substr(beg, len);
}

int getMatchLength(String a, String b) {
	const int len = a.length();
	int x = 0;
	while(x<len && a[x]==b[x]) x++;
	return x;
}

String getCommonFilename(std::vector<Path>& paths) {
	if(paths.size() < 1) {
		printf("WARNING: getCommonFilename() was given an empty list of paths\n");
		return "<NONE>";
	}
	String first = paths[0].filename().string();
	int matchlen = first.length();
	for(int i=1;i<paths.size();i++) matchlen = std::min(matchlen, getMatchLength(first, paths[i].filename().string()));
	if(matchlen < 1) {
		printf("WARNING: getCommonFilename() match length is < 1\n");
		return "<NONE>";
	}
	if(first[matchlen-1] == '_') matchlen--;
	return first.substr(0, matchlen);
}


// ============================================================
// metadata processing
// ------------------------------------------------------------

std::vector<Path> getMetadataVec(std::vector<Path> paths, Path meta_dir, String fname_suffix) {
	std::vector<Path> metas;
	for(Path path : paths) {
		String fname = path.filename().string().append(fname_suffix);
		Path   fpath = appendFilename(meta_dir, fname);
		metas.push_back(fpath);
	}
	return metas;
}

std::vector<String> getLinesFromTextFile(Path path) {
	std::vector<String> lines;
	std::fstream file { path, file.binary | file.in | file.ate/*start at-the-end*/ };
	if (!file.is_open())
		printf("failed to open %s", path.string().c_str());
	else {
		// read text from file
		const size_t size = file.tellp();
		String text(size, '\0');
		file.seekp(0);
		file.read(text.data(), size);
		text.append("\n");// end with newline to make following code simpler.
		printf("----- text: -----\n%s\n\n", text.c_str());
		// get substring intervals
		std::vector<size_t> positions;
		size_t pos = 0;
		size_t cycles = 0;
		size_t MAX_CYCLES = 10 * 1000000;
		while((pos < size) & (cycles < MAX_CYCLES)) {
			const size_t p0 = pos;
			const size_t p1 = text.find("\n", pos);
			if(pos == std::string::npos) break;
			positions.push_back(p0);
			positions.push_back(p1);
			pos = p1+1;
			cycles++;
		}
		// get lines
		const int X = positions.size();
		for(int x=0;x<X;x+=2) {
			const int ofs = positions[x+0];
			const int len = positions[x+1] - positions[x+0];
			lines.push_back(text.substr(ofs, len));
		}
	}
	return lines;
}





