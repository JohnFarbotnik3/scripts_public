
/*
- tree structure is based on string-keys, where tree is traversed by value of each string character until leaf is encountered.
- keys are decomposed by each step of this traversal, so only the "key-remainder" is used as the leafdata-key (to save storage space),
	and the part that is consumed by traversal is described as the node's path-key.
- note that nodes can have both child nodes and leaf data since some keys may be too short to send to child nodes.
*/

class TreeMapNode_Map {
	constructor(parent = null, selfKey = null) {
		this.parent = parent;
		this.selfKey = selfKey;
		this.pathKey = parent ? parent.pathKey.concat(selfKey) : "";
		this.children = new Map();
		this.leafdata = new Map();
	}
	// getters
	get isRoot () { return !this.parent; }
	get isLeaf () { return this.children.size === 0; }
	get isEmpty() { return this.children.size === 0 && this.leafdata.size === 0; }
	get size() {
		let sum = this.leafdata.size;
		for(const child of this.children.values()) sum += child.size;
		return sum;
	}
	// operations & iterators
	has(key)		{ return this.leafdata.has(key); }
	get(key)		{ return this.leafdata.get(key); }
	set(key, value)	{ this.leafdata.set(key, value); }
	delete(key)		{ this.leafdata.delete(key); }
	keys   ()		{ return this.leafdata.keys(); }
	values ()		{ return this.leafdata.values(); }
	entries()		{ return this.leafdata.entries(); }
	// spread leaf-data to children
	// NOTE: assumes children have already been created
	spread() {
		for(const [key, value] of this.leafdata.entries()) {
			if(key.length <= 1) continue;// skip if key is too small
			const c_key = key[0];
			const d_key = key.slice(1);
			const child = this.children.get(c_key);
			child.leafdata.set(d_key, value);
			this.leafdata.delete(key);
		}
	}
	// gather leaf-data from children
	// NOTE: assumes children have already gathered from their children
	gather() {
		for(const [c_key, child] of this.children.entries())
		for(const [d_key, value] of child.leafdata.entries()) this.leafdata.set(c_key.concat(d_key), value);
	}
	// import & export data
	export() {
		return [[...this.children.keys()], [...this.leafdata.entries()]];
	}
	import(data) {
		const [children, leafdata] = data;
		if(children.length > 0) for(const c_key of children) this.children.set(c_key, null);
		if(leafdata.length > 0) for(const [k,v] of leafdata) this.leafdata.set(k,v);
	}
};

class TreeMapNode_Set {
	constructor(parent = null, selfKey = null) {
		this.parent = parent;
		this.selfKey = selfKey;
		this.pathKey = parent ? parent.pathKey.concat(selfKey) : "";
		this.children = new Map();
		this.leafdata = new Set();
	}
	// getters
	get isRoot () { return !this.parent; }
	get isLeaf () { return this.children.size === 0; }
	get isEmpty() { return this.children.size === 0 && this.leafdata.size === 0; }
	get size() {
		let sum = this.leafdata.size;
		for(const child of this.children.values()) sum += child.size;
		return sum;
	}
	// operations & iterators
	has(key)		{ return this.leafdata.has(key); }
	get(key)		{ return this.leafdata.has(key); }
	set(key, value)	{ this.leafdata.add(key); }
	delete(key)		{ this.leafdata.delete(key); }
	keys   ()		{ return this.leafdata.keys(); }
	values ()		{ return []; }
	entries()		{ return []; }
	// spread leaf-data to children
	// NOTE: assumes children have already been created
	spread() {
		for(const key of this.leafdata.keys()) {
			if(key.length <= 1) continue;// skip if key is too small
			const c_key = key[0];
			const d_key = key.slice(1);
			const child = this.children.get(c_key);
			child.leafdata.add(d_key);
			this.leafdata.delete(key);
		}
	}
	// gather leaf-data from children
	// NOTE: assumes children have already gathered from their children
	gather() {
		for(const [c_key, child] of this.children.entries())
		for(const d_key of child.leafdata.keys()) this.leafdata.add(c_key.concat(d_key));
	}
	// import & export data
	export() {
		return [[...this.children.keys()], [...this.leafdata.keys()]];
	}
	import(data) {
		const [children, leafdata] = data;
		if(children.length > 0) for(const c_key of children) this.children.set(c_key, null);
		if(leafdata.length > 0) for(const d_key of leafdata) this.leafdata.add(d_key);
	}
};

// TODO: investigate ways to flatten the data structure
class TreeMap {
	NodeClass = null;// the map-like node this structure uses
	callbacks = null;// storage callbacks
	sizeLimit = 0;// maximum size of leaf before it will try to transfer leaf-data to children
	root = null;
	n_search = 0;
	n_create = 0;
	n_remove = 0;
	n_conv_n = 0;
	n_conv_l = 0;
	constructor(NodeClass, storageCallbacks, sizeLimit = 32) {
		this.NodeClass = NodeClass;
		this.root = new NodeClass();
		this.callbacks = storageCallbacks;
		this.sizeLimit = sizeLimit;
	}
	// create & remove children
	createChild(parentNode, childKey) {
		this.n_create++;
		const childNode = new this.NodeClass(parentNode, childKey);
		parentNode.children.set(childKey, childNode);
		this.pushUpdateOperation(parentNode);
		return childNode;
	}
	removeChild(parentNode, childKey) {
		this.n_remove++;
		const childNode = parentNode.children.get(childKey);
		parentNode.children.delete(childKey);
		this.pushDeleteOperation(childNode);
	}
	// find node that this key belongs to
	search(key) {
		this.n_search++;
		let node = this.root;
		let depth = 0;
		// traverse tree along path defined by characters in key
		while((depth < key.length - 1) & (node.children.has(key[depth]))) {
			node = node.children.get(key[depth]);
			depth++;
		}
		// if the node is a leaf, this node has the key, or if the key is too short,
		// then we have found the correct node.
		const d_key = key.slice(depth);
		const found = node.isLeaf || node.has(d_key) || (depth >= key.length - 1);
		return {node, depth, found};
	}
	// operations
	has(key) { const {node, depth, found} = this.search(key); return node.has(key.slice(depth)); }
	get(key) { const {node, depth, found} = this.search(key); return node.get(key.slice(depth)); }
	async add(key) { await this.set(key, true); }
	async set(key, value=true) {
		let {node, depth, found} = this.search(key);
		// create child if needed, and update data subkey
		if(!found) {
			const c_key = key[depth];
			node = this.createChild(node, c_key);
			depth++;
		}
		// early return value is the same
		const d_key = key.slice(depth);
		if(value && node.get(d_key) === value) return;
		// set data + size check
		node.set(d_key, value);
		this.pushUpdateOperation(node);
		if(node.isLeaf && node.size > this.sizeLimit) this.convertToNode(node);
		// commit changes
		await this.commitOperations();
	}
	async delete(key) {
		const {node, depth, found} = this.search(key);
		// early return if node does not have key
		const d_key = key.slice(depth);
		if(!found || !node.has(d_key)) return;
		// delete data + size check
		node.delete(d_key);
		this.pushUpdateOperation(node);
		if(node.parent && node.parent.size < this.sizeLimit) this.convertToLeaf(node.parent);
		// remove node if empty
		else if(node.isEmpty && node.parent) this.removeChild(node.parent, node.selfKey);
		// commit changes
		await this.commitOperations();
	}
	// spread keys from this node into children
	convertToNode(node) {
		this.n_conv_n++;
		// create children required for spread operation
		for(const key of node.keys()) if(!node.children.has(key[0])) this.createChild(node, key[0]);
		// spread, then push updates
		node.spread();
		for(const child of node.children.values()) this.pushUpdateOperation(child);
		this.pushUpdateOperation(node);
	}
	// recursively gather keys from children into this node
	convertToLeaf(node) {
		this.n_conv_l++;
		// ensure children have gathered data first
		for(const child of node.children.values()) this.convertToLeaf(child);
		// gather, then push updates
		node.gather();
		for(const c_key of node.children.keys()) this.removeChild(node, c_key);
		this.pushUpdateOperation(node);
	}
	// tree iterators
	get size() {
		return this.root.size;
	}
	nodes() {
		// TODO: learn how to write a proper iterator so that these arrays are not needed
		const nodes = [this.root];
		let i = 0;
		while(i < nodes.length) {
			const node = nodes[i++];
			for(const child of node.children.values()) nodes.push(child);
		}
		return nodes;
	}
	keys() {
		const arr=[], nodes=this.nodes();
		for(const node of nodes) for(const d_key of node.keys()) arr.push(node.pathKey.concat(d_key));
		return arr;
	}
	values() {
		const arr=[], nodes=this.nodes();
		for(const node of nodes) for(const value of node.values()) arr.push(value);
		return arr;
	}
	entries() {
		const arr=[], nodes=this.nodes();
		for(const node of nodes) for(const [k,v] of node.entries()) arr.push([node.pathKey.concat(k), v]);
		return arr;
	}
	// save & load
	updateQueue = new Set();// map of nodes to set or update
	deleteQueue = new Set();// map of nodes to delete
	pushUpdateOperation(node) { this.updateQueue.add(node); this.deleteQueue.delete(node); }
	pushDeleteOperation(node) { this.updateQueue.delete(node); this.deleteQueue.add(node); }
	async commitOperations() {
		if(!this.callbacks) return;
		const {args, fget, fset, fdel} = this.callbacks;
		const updates = [...this.updateQueue.values()].map(node => fset(args, node.pathKey, node.export()));
		const deletes = [...this.deleteQueue.values()].map(node => fdel(args, node.pathKey));
		for(const prom of updates) await prom;
		for(const prom of deletes) await prom;
		this.updateQueue.clear();
		this.deleteQueue.clear();
	}
	async load() { await this.loadNode(this.root); }
	async loadNode(node) {
		// clear old data
		node.children.clear();
		node.leafdata.clear();
		// get data
		if(!this.callbacks) return;
		const {args, fget, fset, fdel} = this.callbacks;
		const data = await fget(args, node.pathKey);
		if(!data) return;
		// import data
		node.import(data);
		// create children here since import only sets keys, but doesnt actually create the children
		for(const c_key of node.children.keys()) this.createChild(node, c_key);
		// load children
		const loads = [...node.children.values()].map(child => this.loadNode(child));
		for(const prom of loads) await prom;
	}
};

/* Tests

async function test(params = {}) {
let {N, S, P, D, T, I} = params;
if(N === undefined) N = 30000;	// number of test operations
if(S === undefined) S = 16;		// leaf size
if(P === undefined) P = false;	// print tree after each operation
if(D === undefined) D = true;	// test loading data
if(T === undefined) T = Map;	// node type
if(I === undefined) I = false;	// test iterators

const NodeClass = T === Map ? TreeMapNode_Map : TreeMapNode_Set;
const data = new Map();
const args = "test";
const fget = (args, key)        => JSON.parse(data.get(`${args}_${key}`) ?? null);
const fset = (args, key, value) => data.set(`${args}_${key}`, JSON.stringify(value));
const fdel = (args, key)        => data.delete(`${args}_${key}`);
const callbacks = D ? {args, fget, fset, fdel} : null;
let _map = new Map();
const tree = new TreeMap(NodeClass, callbacks, S);
const treeLoadTest = new TreeMap(NodeClass, callbacks, S);
await tree.load();

if(T === Set) {
	_map = new Set();
	_map.get = _map.has;
	_map.set = _map.add;
}

function nodeToString(node = tree.root) {
	let str = "";
	str += `${node.pathKey}: ${JSON.stringify({ch: [...node.children.keys()], lf: [...(node.entries ? node.entries() : node.keys())]})}\n`;
	for(const child of node.children.values()) str += nodeToString(child);
	return str;
}

console.log("generate test data", N);
const keys = [];
for(let n=0;n<N/4;n++) {
	let key = "";
	let k = Math.random() * 10;
	for(let x=0;x<k;x++) key += String(Math.floor(Math.random()*10));
	keys.push(key);
}
const ops = [];
for(let n=0;n<N;n++) {
	let oper = Math.random();
	let key = keys[Math.floor(Math.random() * keys.length)];
	let val = `VALUE_${key}`;
	ops.push([oper, key, val]);
}

function op_0(mapA, mapB, key, value) {
	let a,b;
	if(mapA) a = mapA.get(key);
	if(mapB) b = mapB.get(key);
	if(mapA && mapB && a !== b) console.log("a !== b", `[${key}]`, a, b);
	return a === b;
}
async function op_1(mapA, mapB, key, value) {
	await mapA.set(key, value);
	await mapB.set(key, value);
	if(P) {
		console.log("========");
		console.log("SET mapA, mapB", key, value);
		console.log(nodeToString(mapA?.root));
		console.log(nodeToString(mapB?.root));
		let str=""; for(const [k,v] of data.entries()) str+=`[${k},${v}]`;
		console.log(str);
		console.log("========");
	}
}
async function op_2(mapA, mapB, key, value) {
	await mapA.delete(key, value);
	await mapB.delete(key, value);
	if(P) {
		console.log("========");
		console.log("DEL mapA, mapB", key, value);
		console.log(nodeToString(mapA?.root));
		console.log(nodeToString(mapB?.root));
		let str=""; for(const [k,v] of data.entries()) str+=`[${k},${v}]`;
		console.log(str);
		console.log("========");
	}
}

const t0 = new Date();
let match = true;
console.log("run test operations");
for(let n=0;n<N;n++) {
	const [oper, key, val] = ops[n];
	if(0.0 < oper && oper <= 0.4) match &= op_0(_map, tree, key, val);
	if(0.4 < oper && oper <= 0.7) await op_1(_map, tree, key, val);
	if(0.7 < oper && oper <= 1.0) await op_2(_map, tree, key, val);
	if(!match) { console.log("maps dont match!"); return false; }
}
const t1 = new Date();

console.log("check if maps are identical");
for(let n=0;n<N;n++) {
	const [oper, key, val] = ops[n];
	match &= op_0(_map, tree, key, val);
}
if(!match) { console.log("maps dont match!"); return false; }

console.log("print data");
console.log("data size", JSON.stringify([...data.entries()]).length);
if(D) {
	console.log(data);
	let result = true;
	await treeLoadTest.load();
	console.log("load test: tree1, tree2");
	for(const key of _map.keys()) {
		const res = op_0(tree, treeLoadTest, key, null);
		result &= res;
		if(!res) console.log("map value:", _map.get(key), "fget key: "+key);
	}
	if(!result) {
		console.log("failed load test!");
		console.log("tree1", nodeToString(tree.root));
		console.log("tree2", nodeToString(treeLoadTest.root));
		console.log(data);
		return false;
	}
}
if(P) console.log(nodeToString());
console.log("dt", t1 - t0);
console.log("tree", tree);
console.log("size", tree.size);
if(I) {
	console.log("keys", tree.keys());
	console.log("values", tree.values());
	console.log("entries", tree.entries());
}

return true;

}
async function testUntilFail(params={}, limit=3000, incr=1) {
	let n=10;
	let f=false;
	const oldlog = console.log;
	console.log = () => {};
	while(n<limit) {
		//await new Promise((res,rej) => setTimeout(res, 20));
		if(await test({N: n, S: Math.floor(Math.random() * 126 + 2), ...params})) {}
		else break;
		n+=incr;
	}
	console.log = oldlog;
	while(n<limit) {
		await new Promise((res,rej) => setTimeout(res, 200));
		if(await test({N: n, S: Math.floor(Math.random() * 126 + 2), P: true, ...params})) {console.clear(); console.debug("N:",n);}
		else break;
		n+=incr;
	}
}

//*/



