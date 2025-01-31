
class MapMap {
	_map = new Map();
	constructor() {}
	// submap operations
	has_map(key) { return this._map.has(key); }
	get_map(key) { return this._map.get(key); }
	set_map(key, new_map) { this._map.set(new_map); }
	delete_map(key) { this._map.delete(key); }
	// operations
	has(keys) { const [k1,k2] = keys; return this._map.get(k1)?.has(k2) ?? false; }
	get(keys) { const [k1,k2] = keys; return this._map.get(k1)?.get(k2) ?? undefined; }
	set(keys, value) {
		const [k1,k2] = keys;
		if(!this.has_map(k1)) this._map.set(k1, new Map());
		this._map.get(k1).set(k2, value);
	}
	delete(keys) {
		const [k1,k2] = keys;
		if(!this.has_map(k1)) return;
		this._map.get(k1).delete(k2);
		if(this._map.get(k1).size === 0) this._map.delete(k1);
	}
	// iterators
	get size() {
		let n = 0;
		for(const [k1, map] of this._map.entries()) n += map.size;
		return n;
	}
	// conversions
	export_tuples() {
		const arr = [];
		for(const [k1, map] of this._map.entries())
		for(const [k2, val] of map.entries()) arr.push([k1, k2, val]);
		return arr;
	}
	import_tuples(arr) {
		arr.sort((a,b) => a[0] > b[0]);// sort by key for better performance - TODO: test performance claim
		for(const [k1, k2, val] of arr) this.set([k1, k2], val);
	}
	export_pairs() {
		const arr = [];
		for(const [k1, map] of this._map.entries())
		for(const [k2, val] of map.entries()) arr.push([JSON.stringify([k1, k2]), val]);
		return arr;
	}
	import_pairs(arr) {
		arr.sort((a,b) => a[0] > b[0]);// sort by key for better performance - TODO: test performance claim
		for(const [kk, val] of arr) this.set(JSON.parse(kk), val);
	}
};

// tests
/*
const map = new MapMap();
const arr = [1,2,3];
for(const x of arr) for(const y of arr) map.set([x, y], x*y+y);
for(const x of arr) for(const y of arr) console.log(`${x}, ${y}, ${x}*${y}+${y} === ${map.get([x,y])}: ${map.get([x,y]) === x*y+y}`);
const map2 = new MapMap();
map2.import_pairs(map.export_pairs());
for(const x of arr) for(const y of arr) console.log(`${x}, ${y}, ${map2.get([x,y])} === ${map.get([x,y])}: ${map2.get([x,y]) === map.get([x,y])}`);
*/



