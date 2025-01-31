
// staged map structure for reducing storage IO operations,
// at the expense of some memory and processing power.
class StagedMap {
	// maps
	add_map = null;
	rem_map = null;
	full_map = null;
	// whether or not to immediately save after write operations
	immediate = false;
	saveTimer = null;
	// { args, func: async (args, name, map) => {...} }
	save_diff_callback = null;
	save_full_callback = null;
	// { args, func: async (args, name) => (map | null) }
	load_diff_callback = null;
	load_full_callback = null;
	constructor(
		save_diff_callback,
		save_full_callback,
		load_diff_callback,
		load_full_callback,
		immediate = false,
	) {
		this.add_map = new Map();
		this.rem_map = new Map();
		this.full_map = new Map();
		this.save_diff_callback = save_diff_callback;
		this.save_full_callback = save_full_callback;
		this.load_diff_callback = load_diff_callback;
		this.load_full_callback = load_full_callback;
		this.immediate = immediate;
	}
	// debounced save timer
	resetSaveTimer() {
		if(this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => { this.save(); this.saveTimer=null; }, 100);
	}
	// operations
	get(key) { return this.add_map.get(key) ?? this.full_map.get(key) ?? undefined; }
	has(key) { return this.add_map.has(key) || this.full_map.has(key); }
	async set(key, val) {
		if(val === this.get(key)) return;// do nothing if new value and old value are the same 
		this.add_map.set(key, val);
		this.rem_map.delete(key);
		if(this.immediate) await this.save(); else this.resetSaveTimer();
	}
	async delete(key) {
		if(!this.has(key)) return;// do nothing if staged map doesnt have key
		this.add_map.delete(key);
		this.full_map.delete(key);
		this.rem_map.set(key, true);// track removal in case full_map isnt saved
		if(this.immediate) await this.save(); else this.resetSaveTimer();
	}
	get size() {
		let n = this.add_map.size + this.full_map.size;
		for(const k of this.add_map.keys()) if(this.full_map.has(k)) n--;
		return n;
	}
	// very inefficient iterators
	keys() {
		const set = new Set();
		for(const k of this.full_map.keys()) set.add(k);
		for(const k of this. add_map.keys()) set.add(k);
		return map.keys();
	}
	entries() {
		const map = new Map();
		for(const [k,v] of this.full_map.entries()) map.set(k,v);
		for(const [k,v] of this. add_map.entries()) map.set(k,v);
		return map.entries();
	}
	// commit changes from delta maps to full map
	commit() {
		console.debug("<> StagedMap: commiting diff", this.add_map.size, this.rem_map.size, this.full_map.size);
		for(const key of this.rem_map.keys()) this.full_map.delete(key);
		for(const [k,v] of this.add_map.entries()) this.full_map.set(k,v);
		this.rem_map.clear();
		this.add_map.clear();
		console.debug("<> StagedMap: committed diff", this.add_map.size, this.rem_map.size, this.full_map.size);
	}
	shouldCommit() {
		const k = Math.sqrt(this.full_map.size) + 3;
		return this.add_map.size > k || this.rem_map.size > k;
	}
	// save and load operations
	async save_call(callback, name, map) {
		console.debug(`<> StagedMap: saving map: ${name}`, map.size);
		const {func, args} = callback;
		await func(args, name, map);
	}
	async load_call(callback, name) {
		const {func, args} = callback;
		const map = await func(args, name);
		console.debug(`<> StagedMap: loaded map: ${name}`, map?.size);
		return map;
	}
	async save() {
		if(this.shouldCommit()) {
			this.commit();
			await this.save_call(this.save_full_callback, "full", this.full_map);
		}
		await this.save_call(this.save_diff_callback, "add", this.add_map);
		await this.save_call(this.save_diff_callback, "rem", this.rem_map);
	}
	async load() {
		const map_a = await this.load_call(this.load_diff_callback, "add");
		const map_r = await this.load_call(this.load_diff_callback, "rem");
		const map_f = await this.load_call(this.load_full_callback, "full");
		if(map_a) this.add_map = map_a;
		if(map_r) this.rem_map = map_r;
		if(map_f) this.full_map = map_f;
		// apply deleted values that were not committed
		for(const key of this.rem_map.keys()) {
			this.add_map.delete(key);
			this.full_map.delete(key);
		}
	}
};


// test functions
/*

function map_to_str(map) { return JSON.stringify([...map.entries()]); }
function str_to_map(str) { return new Map(JSON.parse(str)); }
async function map_to_b64(map) { return await map_to_str(map); }
async function b64_to_map(b64) { return await str_to_map(b64); }

var data_map = new Map();
async function save_diff_func(key, name, map) { data_map.set(`${key}_${name}`, map_to_str(map)); }
async function save_full_func(key, name, map) { data_map.set(`${key}_${name}`, await map_to_b64(map)); }
async function load_diff_func(key, name) { const str = data_map.get(`${key}_${name}`); return str ? str_to_map(str) : null; }
async function load_full_func(key, name) { const str = data_map.get(`${key}_${name}`); return str ? b64_to_map(str) : null; }
var smap = new StagedMap(
	{args: "diff", func: save_diff_func},
	{args: "full", func: save_full_func},
	{args: "diff", func: load_diff_func},
	{args: "full", func: load_full_func},
);
var rmap = new Map();

var N = 10000;
var K = 1000;
var V = 1000;
var keys = new Array(N).fill(0);
var vals = new Array(N).fill(0);
var ops = new Array(N).fill(0);
for(let i=0;i<N;i++) {
	keys[i] = Math.floor(Math.random() * K);
	vals[i] = Math.floor(Math.random() * V);
	ops[i] = Math.floor(Math.random() * 1.7);
}
for(let i=0;i<N;i++) {
	const k=keys[i], v=vals[i], op=ops[i];
	if(op===0) { smap.set(k,v); rmap.set(k,v); }
	if(op===1) { smap.delete(k); rmap.delete(k); }
}
await smap.set(1,30);
await rmap.set(1,60);
for(let i=0;i<K;i++) {
	const k=i, x=smap.get(k), y=rmap.get(k);
	if(x!==y) console.log(k,x,y);
}

*/



