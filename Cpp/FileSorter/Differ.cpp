

// TODO:
/*

- recursive flag for toggling directory iterator type
- symmetric flag for doing comparison operation both ways
- support multiple types of diff, as well as moving operations:
* diff
	- vector<path> arrsrc, arrdst
	- sort path arrays (arrsrc, arrdst) by [filename, path]
	- list *indices* of unique items
	- co-iterate both in ascending order
		- list unique names
		- list unique paths per matching name (relative to pathsrc/pathdst)
		- list unique sizes if  matching path
	- print lists after completion
* move
	- same as diff, but also isolate unique items to ./diff directory
		that preserves sub-folder structure
...

*/



