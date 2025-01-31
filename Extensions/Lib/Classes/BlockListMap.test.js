
async function test_BlockListMap() {
	const xa = [];
	for(let x=0;x<100;x+=10) xa.push(x);
	for(let x=100;x<1000;x+=100) xa.push(x);
	for(let x=1000;x<10000;x+=1000) xa.push(x);
	for(let x=10000;x<100000;x+=10000) xa.push(x);
	xa.push(500000);
	for(const x of xa) {
		console.clear();
		const dataMap = new Map();
		function fget_map(args, key)      {
			const str = dataMap.get(`${args}_${key}`);
			//console.log("fget_map", args, key, str);
			return new Map(str ? JSON.parse(str) : []);
		}
		function fget_arr(args, key)      { 
			const str = dataMap.get(`${args}_${key}`);
			//console.log("fget_arr", args, key, str);
			return str ? JSON.parse(str) : null;
		}
		function fset_map(args, key, map) {
			const str = JSON.stringify([...map.entries()]);
			//console.log("fset_map", args, key, str);
			dataMap.set(`${args}_${key}`, str);
		}
		function fset_arr(args, key, arr) {
			const str = JSON.stringify(arr);
			//console.log("fset_arr", args, key, str);
			dataMap.set(`${args}_${key}`, str);
		}
		function fdel_arr(args, key)      { dataMap.delete(`${args}_${key}`); }
		function fdel_map(args, key)      { dataMap.delete(`${args}_${key}`); }
		const callbacksMap = {args:"Map", fget:fget_map, fset:fset_map, fdel:fdel_map};
		const callbacksArr = {args:"Arr", fget:fget_arr, fset:fset_arr, fdel:fdel_arr};
		const map = new BlockListMap(callbacksMap, callbacksArr, 100, SizeEstimators.json, 0.1*1024, 1.6*1024, false);
		await map.load();
		const opweights = [Math.random(), Math.random(), Math.random()];
		const failed = await MapTestUtil.test(map, 100+x, opweights, 10+Math.floor(x/4), 4, dataMap, false);
		if(failed) break;
	}
}

