
//TESTS();
async function TESTS() {
	const fdb = new ForegroundDB("TEST_FDB");
	const cdb = new CompressedDB_gz_b64("TEST_CDB");
	
	console.log("loading");
	await fdb.loaded;
	await cdb.loaded;
	console.log("loaded");
	
	///*
	const dbs = [fdb, cdb];
	for(const db of dbs) {
		console.log("RUNNING DB TEST");
		console.log(`db.count()`, await db.count());
		console.log(`db.keys()`, await db.keys());
		console.log(`db.values()`, await db.values());
		console.log(`db.entries()`, await db.entries());
		
		console.log(`db.has(1)`, await db.has(1));
		console.log(`db.get(1)`, await db.get(1));
		console.log(`db.set(1, ["a","b","c"])`, await db.set(1, ["a","b","c"]));
		console.log(`db.entries()`, await db.entries());
		console.log(`db.get(1)`, await db.get(1));
		console.log(`db.delete(1)`, await db.delete(1));
		
		console.log(`db.count()`, await db.count());
		console.log(`db.keys()`, await db.keys());
		console.log(`db.values()`, await db.values());
		console.log(`db.entries()`, await db.entries());
	}
	//*/
	
	/*
	const strs = ["waiting", "done", "success", "apple", "bananabread"];
	const dbs = [fdb, cdb];
	for(const db of dbs) {
		console.log("RUNNING DB TEST");
		console.log(`db.entries()`, await db.entries());
		const keys = [];
		const vals = [];
		for(let x=0;x<100;x++) {
			const arr = [];
			for(let y=0;y<100;y++) arr.push((y+x*100).toString());
			keys.push(x);
			vals.push(arr);
		}
		for(let x=0;x<keys.length;x++) await db.set(keys[x], vals[x]);
		console.log(`db.entries()`, await db.entries());
		await new Promise((res, rej) => setTimeout(res, 3000));
	}
	//*/
	
}

