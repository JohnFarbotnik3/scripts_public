
const store = new Map();
const truth = new Map();

async function _fhas(args, key) {
	const fullkey = args + "_" + key;
	return await store.has(fullkey);
}
async function _fget(args, key) {
	const fullkey = args + "_" + key;
	const b64 = await store.get(fullkey);
	const str = await decode_b64_to_str(b64);
	const obj = JSON.parse(str);
	return obj;
}
async function _fset(args, key, obj) {
	const fullkey = args + "_" + key;
	const str = JSON.stringify(obj);
	const b64 = await encode_str_to_b64(str);
	await store.set(fullkey, b64);
}
async function _fdel(args, key) {
	const fullkey = args + "_" + key;
	await store.delete(fullkey);
}
async function _fsize(obj) {
	const str = JSON.stringify(obj);
	const b64 = await encode_str_to_b64(str);
	return b64.length;
}

async function tcmp(linmap, k) {
	let a = 		truth .get(k);
	let b = await	linmap.get(k);
	if(a !== b) {
		console.log(truth, linmap, k, a, b);
		throw("TGET");
	}
	return a === b;
}
function tset(linmap, k, v) {
			truth .set(k,v);
	return	linmap.set(k,v);
}
function tdel(linmap, k) {
			truth .delete(k);
	return	linmap.delete(k);
}
async function compare(linmap) {
	let keys = 0;
	let matches = 0;
	for(const k of truth.keys()) {
		keys++;
		matches += await tcmp(linmap, k);
	}
	console.log("COMPARE RESULT: ", matches, keys);
	console.log(truth);
	console.log(linmap);
	if(!linmap.cache.size === truth.size) throw(`SIZES DONT MATCH`);
}

async function TEST_1() {
	console.log("TEST_1");
	const linbuf = new LinearStorageBuffer("prefix", _fhas, _fget, _fset, _fdel, _fsize, 0);
	const linmap = new LinearBlockMap(linbuf, 256, 4096);
	await linmap.load();
	console.log("TEST_1 loaded");
	///*
	console.log("TEST_1 setting (sync)");
	for(let x=0;x<1000;x++) await tset(linmap, x, x*1000);
	console.log("TEST_1 setting done");
	console.log("TEST_1 waiting");
	await linmap.flush();
	console.log("TEST_1 waiting done");
	//*/
	///*
	console.log("TEST_1 setting (async)");
	const proms = [];
	for(let x=0;x<3;x++) proms.push(tset(linmap, x+5, (x+5)*10));
	for(let x=0;x<3;x++) proms.push(tdel(linmap, x+4));
	console.log("TEST_1 setting done");
	console.log("TEST_1 waiting");
	await linmap.flush();
	console.log("TEST_1 waiting done");
	//*/
	
	await compare(linmap);
}
async function TEST_2() {
	// generate configurations.
	const test_params = [];
	const arr_sz = [[0,256], [128, 1024], [756, 1024], [256, 4096], [1024, 65536]];
	const arr_n = [0, 1, 10, 100, 1000];
	const arr_m = [10, 100, 10000, 100000];
	const arr_w = [0.5, 0.7, 0.1, 0.3, 0.9, 0.01, 0.99, Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];
	for(const [lo,hi] of arr_sz)
	for(const n of arr_n)
	for(const m of arr_m)
	for(const w of arr_w) test_params.push([lo, hi, n, m, w]);
	// test
	try {
	for(const params of test_params) {
		// randomly clear.
		if(Math.random() < 0.2) {
			console.log("TEST_2 CLEARED MAPS");
			truth.clear();
			store.clear();
		} else {
			console.log("TEST_2 KEPT MAPS");
		}
	
		const [MINSZ, MAXSZ, N, M, WSET] = params;
		const linbuf = new LinearStorageBuffer("prefix", _fhas, _fget, _fset, _fdel, _fsize, 0);
		const linmap = new LinearBlockMap(linbuf, MINSZ, MAXSZ);
		
		//await compare(linmap);
		
		console.log("TEST_2 loading");
		await linmap.load();
		await compare(linmap);
		console.log("TEST_2 loaded");
		
		for(let x=0;x<N;x++) {
			const OP = Math.random();
			if(OP < WSET)	tset(linmap, Math.floor(Math.random()*M), x);
			else			tdel(linmap, Math.floor(Math.random()*M));
		}
		for(let x=0;x<N;x++) {
			const OP = Math.random();
			if(OP < WSET)	tset(linmap, Math.floor(Math.random()*M).toString(), x.toString());
			else			tdel(linmap, Math.floor(Math.random()*M).toString());
		}
		await linmap.flush();
		await compare(linmap);
	}
	} catch(error) { console.log(store, truth); console.error(error); throw(error); }
}
async function TEST_ALL() {
	//await TEST_1();
	await TEST_2();
	console.log("ALL TEST COMPLETED");
}
TEST_ALL();



