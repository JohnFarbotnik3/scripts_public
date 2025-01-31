#include <string>
#include <vector>
#include <algorithm>

using std::string;
using std::vector;

// ==============================
// misc functions
// ==============================
void sleep(int sec) {
	std::chrono::seconds time(sec);
	std::this_thread::sleep_for(time);
}

// ==============================
// string functions
// ==============================
bool isNumeric(string str, int a, int b) {
	bool cond = true;
	for(int x=a;x<b;x++) cond &= ('0' <= str[x] && str[x] <= '9');
	return cond;
}

int toNumeric(string str, int a, int b) {
	int n = 0;
	for(int x=a;x<b;x++) n = n * 10 + (str[x] - '0');
	return n;
}

template<class A, class B>
int strCompare(A a, B b) {
	int n = 0;
	while(a[n] && b[n] && a[n] == b[n]) n++; 
	return a[n] - b[n];
}

// ==============================
// print functions
// ==============================
void printMult(string str, int num, string end="") {
	for(int x=0;x<num;x++) printf("%s", str.c_str());
	printf("%s", end.c_str());
}
void printArgs(int argc, char** argv) {
	printf("%-10s: %i\n", "argc", argc);
	for(int x=0;x<argc;x++) {
		char buf[256];
		sprintf(buf, "argv[%i]", x);
		printf("%-10s: %s\n", buf, argv[x]);
	}
	printMult("-", 30, "\n");
}

// ==============================
// commandline parsing functions
// ==============================
const int NONE_ARG_INDEX = -1;
int getArgIndex(int argc, char** argv, string flag) {
	for(int x=0;x<argc;x++)
		if(strCompare(flag, argv[x]) == 0)
			return x;
	return NONE_ARG_INDEX;
}
int getArgIndex(int argc, char** argv, vector<string> flags) {
	for(string flag : flags) {
		int i = getArgIndex(argc, argv, flag);
		if(i != NONE_ARG_INDEX) return i; 
	}
	return NONE_ARG_INDEX;
}
bool getArgExists(int argc, char** argv, string flag) {
	return getArgIndex(argc, argv, flag) != NONE_ARG_INDEX;
}
bool getArgExists(int argc, char** argv, vector<string> flags) {
	return getArgIndex(argc, argv, flags) != NONE_ARG_INDEX;
}
int64_t getArgInt(int argc, char** argv, int ind, int64_t defaultValue) {
	if(ind >= argc) return defaultValue;
	return std::stol(argv[ind], NULL, 10);
}
int64_t getArgInt(int argc, char** argv, string flag, int indOffset, int64_t defaultValue) {
	int ind = getArgIndex(argc, argv, flag);
	if(ind == NONE_ARG_INDEX) return defaultValue;
	return getArgInt(argc, argv, ind + indOffset, defaultValue);
}
string getArgStr(int argc, char** argv, int ind, string defaultValue) {
	if(ind >= argc) return defaultValue;
	return string(argv[ind]);
}
string getArgStr(int argc, char** argv, string flag, int indOffset, string defaultValue) {
	int ind = getArgIndex(argc, argv, flag);
	if(ind == NONE_ARG_INDEX) return defaultValue;
	return getArgStr(argc, argv, ind + indOffset, defaultValue);
}

// ==============================

