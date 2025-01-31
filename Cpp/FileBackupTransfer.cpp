#include "./Utils/FileIO.hpp"
#include <cstring>
#include <time.h>

struct TransferItem {
	Path src_path;
	Path rel_path;
	Path dst_path;
	size_t src_size;
	size_t dst_size;
	bool has_src;
	bool has_dst;
	
	TransferItem(const Path rel_path, const Path src_dir, const Path dst_dir) {
		this->rel_path = rel_path;
		this->src_path = Path(src_dir).append(this->rel_path.c_str());
		this->dst_path = Path(dst_dir).append(this->rel_path.c_str());
		if(std::filesystem::is_regular_file(this->src_path)) {
			this->src_size = std::filesystem::file_size(this->src_path);
			this->has_src = true;
		} else {
			this->src_size = 0;
			this->has_src = false;
		}
		if(std::filesystem::is_regular_file(this->dst_path)) {
			this->dst_size = std::filesystem::file_size(this->dst_path);
			this->has_dst = true;
		} else {
			this->dst_size = 0;
			this->has_dst = false;
		}
	}
};

void sleep_ns(size_t value) {
	std::timespec time;
	std::timespec time_leftover;
	time.tv_sec  = value / 1000000000;
	time.tv_nsec = value % 1000000000;
	nanosleep(&time, &time_leftover);
}
void sleep_sec(size_t value) {
	sleep_ns(value * 1000000000);
}

int clear_vm_cached_pages() {
	char cmdstr[1024];
	//printf("triggering sync\n");
	//snprintf(cmdstr, 1024, "sync");
	//system(cmdstr);
	printf("waiting 10 seconds\n");
	sleep_sec(10);
	printf("clearing vm cache-pages\n");
	snprintf(cmdstr, 1024, "sh -c 'echo 1 >/proc/sys/vm/drop_caches'");
	int status = system(cmdstr);
	if(status != 0) { printf("failed to clear pages.\n"); return 1; }
	printf("waiting 10 seconds\n");
	sleep_sec(10);
	return 0;
}

/*
BUILD:
	g++ -o "./FileBackupTransfer" "./FileBackupTransfer.cpp"
RUN:
	"./FileBackupTransfer" "src_dir" "dst_dir" "transfer_size" "transfer_wait"
	"./FileBackupTransfer" "/dev/shm/downloads/temp/A" "/dev/shm/downloads/temp/B" "700" "7000" "3" "0" "0"
*/
int main(int argc, char** argv) {
	// print arguments.
	for(int x=0;x<argc;x++) {
		string str = string(argv[x]);
		printf("argv[%i]: %s\n", x, str.c_str());
	}
	
	// process arguments.
	if(argc <= 1) printf("missing: src_dir\n");
	if(argc <= 2) printf("missing: dst_dir\n");
	if(argc <= 3) printf("missing: transfer_size  (MiB)\n");
	if(argc <= 4) printf("missing: transfer_limit (MiB)\n");
	if(argc <= 5) printf("missing: transfer_wait (sec)\n");
	if(argc <= 6) printf("missing: proceed (0|1)\n");
	if(argc <= 6) return 1;
	if(argc <= 7) printf("missing optional: virtual memory page-clear (0|1)\n");
	Path src_dir = Path(argv[1]);
	Path dst_dir = Path(argv[2]);
	size_t transfer_size	= std::stol(argv[3]);
	size_t transfer_limit	= std::stol(argv[4]);
	size_t current_limit	= transfer_limit;
	int transfer_wait		= std::stol(argv[5]);
	int do_transfer			= std::stol(argv[6]);
	int do_page_clear		= (argc >= 7) ? std::stol(argv[7]) : 0;
	
	// get all files between src and dst directories.
	std::set<string> all_paths;
	if(std::filesystem::is_directory(src_dir)) {
		vector<Entry> src_entries = getEntriesRecursive(src_dir);
		for(const auto entry : src_entries) {
			const Path rel_path = std::filesystem::relative(entry.path(), src_dir);
			if(entry.is_regular_file()) all_paths.insert(rel_path.c_str());
		}
	} else {
		printf("'%s' is not a directory!\n", src_dir.c_str());
		return 1;
	}
	if(std::filesystem::is_directory(dst_dir)) {
		vector<Entry> dst_entries = getEntriesRecursive(dst_dir);
		for(const auto entry : dst_entries) {
			const Path rel_path = std::filesystem::relative(entry.path(), dst_dir);
			if(entry.is_regular_file()) all_paths.insert(rel_path.c_str());
		}
	} else {
		//printf("'%s' is not a directory!\n", dst_dir.c_str());
		//return 1;
	}
	
	// categorize files.
	vector<TransferItem> items_no_src;
	vector<TransferItem> items_no_dst;
	vector<TransferItem> items_same_size;
	vector<TransferItem> items_diff_size;
	for(const auto rel_pathstr : all_paths) {
		const Path rel_path = Path(rel_pathstr);
		const TransferItem item = TransferItem(rel_path, src_dir, dst_dir);
		     if(!item.has_src)					items_no_src.push_back(item);
		else if(!item.has_dst)					items_no_dst.push_back(item);
		else if(item.src_size == item.dst_size)	items_same_size.push_back(item);
		else if(item.src_size != item.dst_size)	items_diff_size.push_back(item);
	}
	printf("files with same size: %lu/%lu\n", items_same_size.size(), all_paths.size());
	for(const auto item : items_no_src) printf("not in src:\t%s\n", item.dst_path.c_str());
	for(const auto item : items_no_dst) printf("not in dst:\t%s\n", item.src_path.c_str());
	//for(const auto item : items_same_size) printf("same size [ %9lu == %9lu ]:\t%s\n", item.src_size, item.dst_size, item.rel_path.c_str());
	for(const auto item : items_diff_size) printf("diff size [ %9lu != %9lu ]:\t%s\n", item.src_size, item.dst_size, item.rel_path.c_str());
	
	// log some info and ask to proceed.
	size_t total_num = 0;
	size_t total_tsz = 0;
	vector<TransferItem> items_to_copy = items_no_dst;
	for(const auto item : items_to_copy) {
		total_num += 1;
		total_tsz += item.src_size;
	}
	printf("files to transfer      : %lu\n", total_num);
	printf("size  to transfer (MiB): %lu\n", total_tsz/(1024*1024));
	printf("proceed? (Y/N):\n");
	std::FILE* stream = stdin;
	char buffer[64];
	bool proceed = false;
	if(std::fgets(buffer, 64, stream)) {
		const int len = std::strlen(buffer);
		if(len == 2 && buffer[0] == 'Y') proceed = true;
		//printf("user input: {%s}\n", buffer);
	} else {
		printf("failed to read input.\n");
		return 1;
	}
	printf("proceed = %i.\n", proceed);
	if(!proceed) return 0;
	
	// start transferring files.
	printf("transferring...\n");
	std::set<string> checked_dirs;
	size_t curr_num = 0;
	size_t curr_tsz = 0;
	size_t next_tsz = transfer_size;
	if(do_page_clear > 0) {
		int status = clear_vm_cached_pages();
		if(status != 0) return 1;
	}
	for(const auto item : items_to_copy) {
		if(curr_tsz >= next_tsz) {
			printf("transferred %lu/%lu files (%lu/%lu MiB)\n", curr_num, total_num, curr_tsz/(1024*1024), total_tsz/(1024*1024));
			next_tsz += transfer_size;
			sleep_sec(transfer_wait);
		}
		printf("copying\n   %s\n-> %s\n", item.src_path.c_str(), item.dst_path.c_str());
		if(do_transfer) {
			// check if directory exists.
			const Path dir = item.dst_path.parent_path();
			const string key = dir.c_str();
			if(checked_dirs.count(key) < 1) {
				if(!std::filesystem::is_directory(dir)) {
					std::filesystem::create_directories(dir);
				}
				checked_dirs.insert(key);
			}
			// copy file.
			std::filesystem::copy(item.src_path, item.dst_path);
		}
		curr_num += 1;
		curr_tsz += item.src_size;
		if(curr_tsz >= current_limit) {
			if(do_page_clear == 1) {
				int status = clear_vm_cached_pages();
				if(status != 0) return 1;
				current_limit += transfer_limit;
			} else {
				printf("max transfer size reached, exiting early\n");
				break;
			}
		}
	}
	printf("transferred %lu/%lu files (%lu/%lu MiB)\n", curr_num, total_num, curr_tsz/(1024*1024), total_tsz/(1024*1024));
	printf("done...\n");
}

