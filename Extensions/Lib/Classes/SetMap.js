
// map of sets, for storing large number of key-value pairs
// when there is only a small number of distinct values.
class SetMap {
	setmap = new Map();// Map<value, Set<key>>
	// operations
	has(key) {
		for(const [value,set] of this.setmap.entries()) if(set.has(key)) return true;
		return false;
	}
	get(key) {
		for(const [value,set] of this.setmap.entries()) if(set.has(key)) return value;
		return undefined;
	}
	set(key, value) {
		this.delete(key);
		let set = this.setmap.get(value);
		if(!set) this.setmap.set(value, set=new Set());
		set.add(key);
	}
	delete(key) {
		for(const [value,set] of this.setmap.entries()) if(set.has(key)) {
			set.delete(key);
			if(set.size <= 0) this.setmap.delete(value);
			return;
		}
	}
	// iterators
	keys() {
		const arr = [];
		for(const [value,set] of this.setmap.entries()) for(const key of set.keys()) arr.push(key);
		return arr;
	}
	values() {
		return [...this.setmap.keys()];
	}
	entries() {
		const arr = [];
		for(const [value,set] of this.setmap.entries()) for(const key of set.keys()) arr.push([key,value]);
		return arr;
	}
	// conversions
	static fromMap(map) {
		const setmap = new SetMap();
		for(const [key,value] of map.entries()) setmap.set(key,value);
		return setmap;
	}
	toMap() {
		const map = new Map();
		for(const [value,set] of this.setmap.entries())
		for(const key of set.keys()) map.set(key,value);
		return map;
	}
	// import & export
	static import(data) {
		const setmap = new SetMap();
		for(const arr of data) {
			const value = arr[0];
			for(let i=1;i<arr.length;i++) setmap.set(arr[i], value);
		}
		return setmap;
	}
	export() {
		const data = [];
		// sorting significantly improved performance in test cases
		const entries = [...this.setmap.entries()].sort();
		for(const [value,set] of entries) data.push([value].concat([...set.keys()].sort()));
		return data;
	}
	// JSON
	static fromJSON(str) {
		const preamble = `$${SetMap.name}:`;
		if(str.indexOf(preamble) !== 0) return null;
		return SetMap.import(JSON.parse(str.substring(preamble.length)));
	}
	toJSON() {
		const preamble = `$${SetMap.name}:`;
		return `${preamble}${JSON.stringify(this.export())}`;
	}
	toString() { return this.toJSON(); }
};

/* Tests

function test() {
	const t0 = Date.now();
	function compare(stdmap, setmap) {
		for(const [k,v] of stdmap.entries()) {
			b = setmap.get(k);
			if(b !== v) console.warn("a !== b", k, v, b);
		}
	}
	const kvp = [];
	for(let i=0;i<100000;i++) kvp.push([i, Math.floor(Math.random()*10)]);
	const stdmap = new Map();
	const setmap = new SetMap();
	for(const [k,v] of kvp) {
		stdmap.set(k,v);
		setmap.set(k,v);
	}
	compare(stdmap, setmap);
	console.log("set:", setmap);
	for(const [k,v] of kvp) if(k%2==1) {
		stdmap.delete(k);
		setmap.delete(k);
	}
	compare(stdmap, setmap);
	console.log("del:", setmap);
	console.log("keys:",setmap.keys());
	console.log("values:",setmap.values());
	console.log("entries:",setmap.entries());
	const toMap = setmap.toMap();
	const fromMap = SetMap.fromMap(toMap);
	console.log("toMap:", toMap);
	console.log("fromMap:", fromMap);
	compare(stdmap, fromMap);
	const data = setmap.export();
	const impd = SetMap.import(data);
	console.log("export:", data);
	console.log("import:", impd);
	compare(stdmap, impd);
	const json = setmap.toJSON();
	const fjsn = SetMap.fromJSON(json);
	console.log("toJSON:", json);
	console.log("fromJSON:", fjsn);
	compare(stdmap, fjsn);
	const t1 = Date.now();
	console.log("dt:", t1 - t0);
}
test();

//*/

