
async function test_StorageOperationBuffer() {
	const map = new Map();
	function fset(args, key, value) {
		map.set(key, value);
		console.log("SET", args, key, value);
	}
	function fdel(args, key) {
		map.delete(key);
		console.log("DEL", args, key);
	}
	const wbuf = new StorageOperationBuffer({args:"test", fset, fdel}, 300);
	function wait(time) { return new Promise((res,rej) => {setTimeout(res,time)}); }
	const ops = [
		["SET", "a", 1],
		["DEL", "b", 0],
		["SET", "b", 1],
		["SET", "c", 1],
		["NOP", "-", 350],
		["SET", "a", 2],
		["SET", "a", 3],
		["DEL", "a", 0],
		["SET", "c", 4],
		["NOP", "-", 1000],
	];
	for(const [op,k,v] of ops) {
		if(op === "SET") wbuf.set(k,v);
		if(op === "DEL") wbuf.delete(k);
		if(op === "NOP") await wait(v);
	}
	console.log("pendingOperations", await wbuf.pendingOperations);
	console.log("map", map);
}

