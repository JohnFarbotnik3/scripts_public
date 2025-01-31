
class MapTestUtil {
	static getCycleEndIndex(opcount, Ncycles, cycleN) {
		if(cycleN <  0) return 0;
		if(cycleN >= Ncycles) return opcount;
		return Math.floor(opcount*(cycleN+1)/(Ncycles+1));
	}
	static async compareMaps(newMap, stdMap, keys) {
		console.log("Comparing maps", stdMap, newMap);
		console.log("stdMap contents", new Map([...stdMap.entries()]));
		console.log("newMap contents", new Map([...newMap.map.entries()]));
		let failed=false;
		for(const key of keys) {
			const a =       stdMap.get(key);
			const b = await newMap.get(key);
			if(a !== b) { console.error(`<a !== b> key: ${key}, vstd: ${a}, vnew: ${b}`); failed=true; }
		}
		return failed;
	}
	static generateData(opcount, opweights, keycount) {
		const rand = (min, max) => Math.floor(Math.random()*(max-min) + min);
		// generate keys
		const keys = new Array(keycount);
		for(let i=0;i<keycount;i++) keys[i] = String(rand(0, 0x7fffffff));
		// generate operations
		const [get, set, del] = opweights;
		const sum = get + set + del;
		const g = get/sum;
		const s = set/sum + g;
		const d = del/sum + s;
		const ops = [];
		for(let i=0;i<opcount;i++) {
			const opx = Math.random();
			const key = keys[rand(0,keys.length)];
			const val = `VALUE_${key}`;
			let opc = 0;
			if(0 <= opx && opx < g) { opc=0; }// GET
			if(g <= opx && opx < s) { opc=1; }// SET
			if(s <= opx && opx < 1) { opc=2; }// DEL
			ops.push([opc, key, val]);
		}
		return [keys, ops];
	}
	static async doOperations(stdMap, newMap, ops, beg, end, printOps) {
		let failed = false;
		for(let i=beg;i<end;i++) {
			const [opc, key, val] = ops[i];
			if(opc === 1) {
				if(printOps) console.debug(`SET | k: ${key}, v: ${val}`);
						stdMap.set(key, val);
				await	newMap.set(key, val);
			}
			if(opc === 2) {
				if(printOps) console.debug(`DEL | k: ${key}`);
						stdMap.delete(key);
				await	newMap.delete(key);
			}
			// operation consistency check
			if(printOps) console.debug(`GET | k: ${key}`);
			let a =			stdMap.get(key)
			let b = await	newMap.get(key);
			if(a !== b) { console.error(`<a !== b> key: ${key}, vstd: ${a}, vnew: ${b}`); failed=true; }
		}
		return failed;
	}
	static async doOperations_batched(stdMap, newMap, ops, beg, end, printOps, batchSize) {}//TODO
	static async doOperations_arrayed(stdMap, newMap, ops, beg, end, printOps, arraySize) {}//TODO (getM, setM, deleteM)
	static async test(newMap, opcount, opweights, keycount, savecycles, loadFunc, printOps=false, opSettings={/*TODO*/}) {
		console.log("Generating test data");
		// generate data
		const [keys, ops] = MapTestUtil.generateData(opcount, opweights, keycount);
		// run test cycles
		let failed = false;
		const stdMap = new Map();
		for(let c=0;c<savecycles;c++) {
			if(c > 0) {
				console.log(`Loading map (cycle: ${c})`);
				newMap = await loadFunc(newMap);
				failed |= await MapTestUtil.compareMaps(newMap, stdMap, keys);
			}
			console.log(`Running test operations (cycle: ${c})`);
			const beg = MapTestUtil.getCycleEndIndex(opcount, savecycles, c-1);
			const end = MapTestUtil.getCycleEndIndex(opcount, savecycles, c);
			failed |= await MapTestUtil.doOperations(stdMap, newMap, ops, beg, end, printOps);
			failed |= await MapTestUtil.compareMaps(newMap, stdMap, keys);
		}
		return failed;
	}
};

