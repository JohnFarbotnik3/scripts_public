
// TODO: code cleanup + finish implementing

async function test_StorageInterface() {
	console.clear();
	// request & response
	let client;
	let server;
	let requestPromise;// [res, rej]
	async function requestFunc(msg) {
		return new Promise((res, rej) => {
			requestPromise = [res, rej];
			res(server.onRequest(msg));
		});
	}
	// server operations
	const serverDB = new Map();
	async function getFunc(keys) { return keys.map(k => [k, serverDB.get(k)]); }
	async function setFunc(ents) { for(const [k,v] of ents) serverDB.set(k,v); }
	async function delFunc(keys) { for(const  k    of keys) serverDB.delete(k); }
	async function allKeysFunc() { return [...serverDB.keys()]; }
	async function allEntsFunc() { return [...serverDB.entries()]; }
	// loadfunc
	async function loadFunc() {
		client = test_newClient();
		server = test_newServer();
		return client;
	}
	async function resetFunc() {
		serverDB.clear();
		return loadFunc();
	}
	// init
	function test_newClient() { return new StorageInterfaceClient(requestFunc, 100, 5); }
	function test_newServer() { return new StorageInterfaceServer(getFunc, setFunc, delFunc, allKeysFunc, allEntsFunc); }
	client = test_newClient();
	server = test_newServer();
	
	// data sets
	const data_sets = [
		[1,2,2],[1,10,1],[1,1,10], ...(new Array(10).fill(0).map(n => [Math.random(),Math.random(),Math.random()]))
	].map(opweights => MapTestUtil.generateData(Math.ceil(10000 * Math.random()), opweights, Math.ceil(1000 * Math.random())));
	const n_groups = 5;
	
	// batched test
	console.log("batched test");
	for(const [keys, _ops] of data_sets) {
		const stdmap = new Map();
		const newmap = await resetFunc();
		for(let x=0;x<n_groups;x++) {
			const N = _ops.length;
			const x1 = Math.floor((x+0)/n_groups*N);
			const x2 = Math.floor((x+1)/n_groups*N);
			const ops = _ops.slice(x1, x2);
			console.log(`group: [${x1}:${x2}]`);
			// ---------------
			const gets = [];
			const sets = [];
			const dels = [];
			console.log("performing operations");
			for(const [opc, key, val] of ops) {
				if(opc === 0) { gets.push(newmap.get(key)); }
				if(opc === 1) { sets.push(newmap.set(key, val));	stdmap.set(key, val); }
				if(opc === 2) { dels.push(newmap.delete(key));		stdmap.delete(key); }
			}
			for(const prom of gets) await prom;
			for(const prom of sets) await prom;
			for(const prom of dels) await prom;
			// compare maps
			console.log("comparing maps");
			const get_s = [];
			const get_n = [];
			let aeqb = 0;
			let anqb = 0;
			for(const k of keys) {
				get_s.push(stdmap.get(k));
				get_n.push(newmap.get(k));
			}
			for(let i=0;i<keys.length;i++) {
				const a = get_s[i];
				const b = await get_n[i];
				if(a !== b) console.error("a !== b (GET)", keys[i], a, b);
				if(a !== b) anqb++; else aeqb++;
			}
			console.log("a === b: ", aeqb, "a !== b", anqb);
		}
	}
	
	// arrayed test
	console.log("arrayed test");
	for(const [keys, _ops] of data_sets) {
		const stdmap = new Map();
		const newmap = await resetFunc();
		for(let x=0;x<n_groups;x++) {
			const N = _ops.length;
			const x1 = Math.floor((x+0)/n_groups*N);
			const x2 = Math.floor((x+1)/n_groups*N);
			const ops = _ops.slice(x1, x2);
			console.log(`group: [${x1}:${x2}]`);
			// ---------------
			const gets = [];// [key]
			const sets = [];// [key, val]
			const dels = [];// [key]
			console.log("performing operations");
			for(const [opc, key, val] of ops) {
				if(opc === 0) { gets.push( key); }
				if(opc === 1) { sets.push([key, val]); }
				if(opc === 2) { dels.push( key); }
			}
			for(const [key,val] of sets) stdmap.set(key, val);
			for(const  key      of dels) stdmap.delete(key);
			const pset = newmap.setMultiple(sets);
			const pdel = newmap.deleteMultiple(dels);
			const pget = newmap.getMultiple(gets);
			// compare get
			console.log("comparing get");
			const vset = await pset;
			const vdel = await pdel;
			const vget = await pget;// [key, val]
			for(let i=0;i<gets.length;i++) {
				const a = stdmap.get(gets[i]);
				const b = vget[i][1];
				if(a !== b) console.error("a !== b (GET)", keys[i], a, b);
			}
			// compare maps
			console.log("comparing maps");
			const get_s = [];
			const get_n = [];
			let aeqb = 0;
			let anqb = 0;
			for(const k of keys) {
				get_s.push(stdmap.get(k));
				get_n.push(newmap.get(k));
			}
			for(let i=0;i<keys.length;i++) {
				const a = get_s[i];
				const b = await get_n[i];
				if(a !== b) console.error("a !== b (GET)", keys[i], a, b);
				if(a !== b) anqb++; else aeqb++;
			}
			console.log("a === b: ", aeqb, "a !== b", anqb);
		}
	}
	
	// index test - TODO: implement
	//...
	
	// generic map test
	/*
	let failed = false;
	failed |= await MapTestUtil.test(client, 1000, [1,2,2], 200, 5, loadFunc, true);
	for(let x=0;x<5;x++) failed |= await MapTestUtil.test(client, 500, [Math.random(), Math.random(), Math.random()], 100, 3, loadFunc, true);
	//*/
}

