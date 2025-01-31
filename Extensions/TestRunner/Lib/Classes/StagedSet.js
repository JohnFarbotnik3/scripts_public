
// staged set structure for reducing storage IO operations,
// based on StagedMap.
class StagedSet {
	// sets
	add_set = null;
	rem_set = null;
	full_set = null;
	// whether or not to immediately save after write operations
	immediate = false;
	saveTimer = null;
	// { args, func: async (args, name, set) => {...} }
	save_diff_callback = null;
	save_full_callback = null;
	// { args, func: async (args, name) => (set | null) }
	load_diff_callback = null;
	load_full_callback = null;
	constructor(
		save_diff_callback,
		save_full_callback,
		load_diff_callback,
		load_full_callback,
		immediate = false,
	) {
		this.add_set = new Set();
		this.rem_set = new Set();
		this.full_set = new Set();
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
	add(key) { return this.add_set.add(key) ?? this.full_set.add(key) ?? undefined; }
	has(key) { return this.add_set.has(key) || this.full_set.has(key); }
	async add(key) {
		if(this.has(key)) return;// do nothing if new value and old value are the same 
		this.add_set.add(key);
		this.rem_set.delete(key);
		if(this.immediate) await this.save(); else this.resetSaveTimer();
	}
	async delete(key) {
		if(!this.has(key)) return;// do nothing if staged set doesnt have key
		this.add_set.delete(key);
		this.full_set.delete(key);
		this.rem_set.add(key);// track removal in case full_set isnt saved
		if(this.immediate) await this.save(); else this.resetSaveTimer();
	}
	get size() {
		let n = this.add_set.size + this.full_set.size;
		for(const k of this.add_set.keys()) if(this.full_set.has(k)) n--;
		return n;
	}
	// very inefficient iterators
	keys() {
		const set = new Set();
		for(const k of this.full_set.keys()) set.add(k);
		for(const k of this.add_set.keys()) set.add(k);
		return set.keys();
	}
	// commit changes from delta sets to full set
	commit() {
		console.debug("<> StagedSet: commiting diff", this.add_set.size, this.rem_set.size, this.full_set.size);
		for(const key of this.rem_set.keys()) this.full_set.delete(key);
		for(const key of this.add_set.keys()) this.full_set.add(key);
		this.rem_set.clear();
		this.add_set.clear();
		console.debug("<> StagedSet: committed diff", this.add_set.size, this.rem_set.size, this.full_set.size);
	}
	shouldCommit() {
		const k = Math.sqrt(this.full_set.size) + 3;
		return this.add_set.size > k || this.rem_set.size > k;
	}
	// save and load operations
	async save_call(callback, name, set) {
		console.debug(`<> StagedSet: saving set: ${name}`, set.size);
		const {func, args} = callback;
		await func(args, name, set);
	}
	async load_call(callback, name) {
		const {func, args} = callback;
		const set = await func(args, name);
		console.debug(`<> StagedSet: loaded set: ${name}`, set?.size);
		return set;
	}
	async save() {
		if(this.shouldCommit()) {
			this.commit();
			await this.save_call(this.save_full_callback, "full", this.full_set);
		}
		await this.save_call(this.save_diff_callback, "add", this.add_set);
		await this.save_call(this.save_diff_callback, "rem", this.rem_set);
	}
	async load() {
		const set_a = await this.load_call(this.load_diff_callback, "add");
		const set_r = await this.load_call(this.load_diff_callback, "rem");
		const set_f = await this.load_call(this.load_full_callback, "full");
		if(set_a) this.add_set = set_a;
		if(set_r) this.rem_set = set_r;
		if(set_f) this.full_set = set_f;
		// apply deleted values that were not committed
		for(const key of this.rem_set.keys()) {
			this.add_set.delete(key);
			this.full_set.delete(key);
		}
	}
};


// test functions
/*

function set_to_str(set) { return JSON.stringify([...set.keys()]); }
function str_to_set(str) { return new Set(JSON.parse(str)); }
async function set_to_b64(set) { return await set_to_str(set); }
async function b64_to_set(b64) { return await str_to_set(b64); }

var data_map = new Map();
async function save_diff_func(key, name, set) { data_map.set(`${key}_${name}`, set_to_str(set)); }
async function save_full_func(key, name, set) { data_map.set(`${key}_${name}`, await set_to_b64(set)); }
async function load_diff_func(key, name) { const str = data_map.get(`${key}_${name}`); return str ? str_to_set(str) : null; }
async function load_full_func(key, name) { const str = data_map.get(`${key}_${name}`); return str ? b64_to_set(str) : null; }
var sset = new StagedSet(
	{args: "diff", func: save_diff_func},
	{args: "full", func: save_full_func},
	{args: "diff", func: load_diff_func},
	{args: "full", func: load_full_func},
);
var rset = new Set();

var N = 10000;
var K = 1000;
var keys = new Array(N).fill(0);
var ops = new Array(N).fill(0);
for(let i=0;i<N;i++) {
	keys[i] = Math.floor(Math.random() * K);
	ops[i] = Math.floor(Math.random() * 1.7);
}
for(let i=0;i<N;i++) {
	const k=keys[i], op=ops[i];
	if(op===0) { sset.add(k); rset.add(k); }
	if(op===1) { sset.delete(k); rset.delete(k); }
}
for(let i=0;i<K;i++) {
	const k=i, x=sset.has(k), y=rset.has(k);
	if(x!==y) console.log(k,x,y);
}

*/



