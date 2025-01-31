
// NOTES:
/*
	At this point, it would be simpler to just grab a copy of zlib,
	write a fully synchronous c++ version of this struct,
	then just write a javscript wrapper around it.
	
	would be simpler, have better performance, and allow better compression.
*/


class LinearStorageBuffer {
	constructor(args, fhas, fget, fset, fdel, fsize, delay) {
		// storage functions.
		this.args = args;
		this.fhas = fhas;	// async(args, key)			=> true | false
		this.fget = fget;	// async(args, key)			=> obj
		this.fset = fset;	// async(args, key, obj)	=> _
		this.fdel = fdel;	// async(args, key)			=> true | false
		this.fsize = fsize;	// async(obj)				=> size (bytes)
		// queue.
		this.setQueue		= new Map();// Map<id, block>
		this.delQueue		= new Set();// Set<id>
		// timer.
		this.delay		= delay;
		this.freq		= Math.min(Math.max(delay/1, 20), 1000);
		this.commitDate	= 0;
		this.itv		= -1;
		this.prom		= null;
		this.res		= null;
		this.rej		= null;
	}
	has   (k  ) { return this.fhas(this.args, k); }
	get   (k  ) { return this.fget(this.args, k); }
	set   (k,v) { this.setQueue.set(k,v);  this.delQueue.delete(k); }
	delete(k  ) { this.setQueue.delete(k); this.delQueue.add(k); }
	async commit() {
		//console.log("commit->start");
		const proms = [];
		for(const  k    of this.delQueue.keys   ()) proms.push(this.fdel(this.args, k   ));
		for(const [k,v] of this.setQueue.entries()) proms.push(this.fset(this.args, k, v));
		await Promise.all(proms);
		// REMINDER: do not forget to clear the queues!
		this.delQueue.clear();
		this.setQueue.clear();
		//console.log("commit->done");
		return true;
	}
	check() {
		console.log("check");
		if(Date.now() >= this.commitDate) {
			this.commit()
				.then (value => { this.res(value); })
				.catch(error => { this.rej(error); })
				.finally(() => {
					console.log("clear interval");
					clearInterval(this.itv);
					this.itv = -1;
				});
		}
	}
	flush() {
		// check if queues are empty.
		if(this.delQueue.size === 0 & this.setQueue.size === 0) {
			return Promise.resolve(true);
		}
		// update activation date.
		this.commitDate = Date.now() + this.delay;
		// check if response should be immediate.
		if(this.delay <= 0) return this.commit();
		// check if new timer should be created.
		if(this.itv === -1) {
			console.log("create interval");
			this.itv = setInterval(() => this.check.call(this), this.freq);
			this.prom = new Promise((res, rej) => {
				this.res = res;
				this.rej = rej;
			});
		}
		// return promise.
		return this.prom;
	}
};

/*
	A list of blocks width a contiguous range of IDs.
	- Blocks can only be added to the end, or removed from the start.
	- These blocks are saved as compressed arrays of keys and values.
	- If a block at the start is too small, it is removed.
	- If a block in the middle is too small, items from the first block will be migrated to it.
	- When updating a value, if it will fit, it is added, else it is migrated to last block.
	
	This storage map is optimized for storing a very large number of very small items,
	with relatively low cumulative data written (to reduce SSD wear).
*/
class LinearBlockMap {
	constructor(storageBuffer, minBlockBytes=256, maxBlockBytes=4096) {
		// cache of stored map contents.
		this.cache = new Map();// Map<key, value>
		// id of block which owns given key.
		this.owners = new Map();// Map<key, id>
		// references to blocks.
		this.blocks = new Map();// Map<id, Block>
		// storage interface.
		this.storage = storageBuffer;
		// size thresholds.
		this.minBlockBytes = minBlockBytes;
		this.maxBlockBytes = maxBlockBytes;
		// range of block ids (inclusive).
		this.id_beg = 0;
		this.id_end = 0;
		this.blocks.set(0, new Map());
		/*
			Due to the size-estimator function being async,
			write operations in this map become async internally
			before they've even scheduled actual operations.
			
			This means that multiple write operations cannot be in-flight
			at the same time withoug significant risk of making this structure
			unstable (undefined behaviour).
			
			The only immediate solution is to for write operations to wait
			until the previous operation has finished.
			
			In the long term, a synchronous compression function
			for writes and size estimates would be highly desirable,
			as it would allow massive simplifications (and speedups)
			to how this data structure works.
			(could c++ gzip -> emscripten-wasm be used for this?)
		*/
		this.previousOperation = Promise.resolve(true);
	}
	// verifiers
	verify_no_duplicate_keys() {
		let set = new Set();
		let dup = 0;
		for(const block of this.blocks.values()) {
			for(const k of block.keys()) {
				if(set.has(k)) dup++; else set.add(k);
			}
		}
		if(dup > 0) throw(`DUPLICATE KEYS: ${dup}`);
	}
	verify_no_remove_block_with_keys(id) {
		for(const k of this.cache.keys()) if(this.owners.get(k) === id) throw("removed block with keys");
	}
	verify_moved_all_keys(id_dst, id_src, block_src) {
		if(block_src.size > 0) { console.log(id_dst, id_src, block_src); throw("didnt move all keys"); }
	}
	// return promise that resolves after next commit operations.
	flush() {
		//this.verify_no_duplicate_keys();
		return this.previousOperation;
	}
	// save block.
	saveBlock(block) {
		const keys = [];
		const vals = [];
		for(const [k,v] of block.entries()) {
			keys.push(k);
			vals.push(v);
		}
		return [keys, vals];
	}
	// load block
	loadBlock(data) {
		const [keys, vals] = data;
		const block = new Map();
		for(let x=0;x<keys.length;x++) block.set(keys[x], vals[x]);
		return block;
	}
	
	// load.
	async load() {
		console.log("load");
		// clear old contents.
		this.cache.clear();
		this.owners.clear();
		this.blocks.clear();
		// check if map exists.
		const exists = await this.storage.has("id_beg");
		console.log("exists", exists);
		if(!exists) {
			// update blocks.
			const block = new Map();
			this.blocks.set(0, block);
			// update range.
			this.id_beg = 0;
			this.id_end = 0;
			this.storage.set("id_beg", 0);
			this.storage.set("id_end", 0);
			// update storage.
			this.storage.set(0, this.saveBlock(block));
			// return early
			return this.storage.flush();
		}
		// load range.
		const id_beg = this.id_beg = await this.storage.get("id_beg");
		const id_end = this.id_end = await this.storage.get("id_end");
		// load blocks.
		const proms = [];
		for(let id=id_beg;id<=id_end;id++) proms.push(this.storage.get(id));
		const datas = [];
		for(let k=0;k<proms.length;k++) datas.push(await proms[k]);
		for(let k=0;k<datas.length;k++) {
			const [keys, vals] = datas[k];
			const block = this.loadBlock(datas[k]);
			const id = k + id_beg;
			this.blocks.set(id, block);
			for(let x=0;x<keys.length;x++) {
				this.cache .set(keys[x], vals[x]);
				this.owners.set(keys[x], id);
			}
		}
		//this.verify_no_duplicate_keys();
		return Promise.resolve(true);
	}
	// basic set operation.
	_set(id, key, value) {
		const block = this.blocks.get(id);
		block       .set(key, value);	// update in block.
		this.owners .set(key, id);		// update owner.
		this.storage.set(id, this.saveBlock(block));	// update storage.
	}
	// basic delete operation.
	_delete(id, key) {
		const block = this.blocks.get(id);
		block       .delete(key);	// update in block.
		this.owners .delete(key);	// update owner.
		this.storage.set(id, this.saveBlock(block));	// update storage.
	}
	// basic move operation.
	_move(id_dst, id_src, key) {
		const block_dst = this.blocks.get(id_dst);
		const block_src = this.blocks.get(id_src);
		const value = block_src.get(key);
		block_dst   .set   (key, value);	// update in block.
		block_src   .delete(key);			// update in block.
		this.owners .set   (key, id_dst);	// update owner.
		this.storage.set(id_dst, this.saveBlock(block_dst));	// update storage.
		this.storage.set(id_src, this.saveBlock(block_src));	// update storage.
	}
	// return size of block (async).
	async blockSize(block) {
		const bytes = await this.storage.fsize(this.saveBlock(block));
		return bytes;
	}
	async doesItemFit(id, key, value) {
		const origBlock = this.blocks.get(id);
		const testBlock = new Map(origBlock.entries());
		testBlock.set(key, value);
		const bytes = await this.blockSize(testBlock);
		return bytes < this.maxBlockBytes;
	}
	async isBlockTooSmall(id) {
		const block = this.blocks.get(id);
		const bytes = await this.blockSize(block);
		return bytes < this.minBlockBytes;
	}
	// append block at end.
	appendBlock() {
		this.id_end++;
		const id = this.id_end;
		const block = new Map();
		this.blocks .set(id, block);					// update blocklist.
		this.storage.set(id, this.saveBlock(block));	// update storage.
		this.storage.set("id_end", this.id_end);		// update range.
		console.log("appendBlock", id);
		return id;
	}
	// remove block at start (it is assumed to be empty).
	removeBlock() {
		const id = this.id_beg;
		this.id_beg++;
		this.blocks .delete(id);					// update blocklist.
		this.storage.delete(id);					// update storage.
		this.storage.set("id_beg", this.id_beg);	// update range.
		console.log("removeBlock", id);
		//this.verify_no_remove_block_with_keys(id);
	}
	// migrate block from start to middle (middle block is assumed to be empty).
	replaceBlock(id_dst) {
		const id_src = this.id_beg;
		const block = this.blocks.get(id_src);
		// verification.
		//this.verify_no_remove_block_with_keys(id_dst);
		// update owner.
		for(const [k,v] of block.entries()) this.owners.set(k, id_dst);
		// update blocklist.
		this.blocks.delete(id_src);
		this.blocks.set   (id_dst, block);
		// update storage.
		this.storage.set   (id_dst, this.saveBlock(block));
		this.storage.delete(id_src);
		// update range.
		this.id_beg++;
		this.storage.set("id_beg", this.id_beg);
	}
	// get operation.
	get(key) {
		return this.cache.get(key);
	}
	// set operation.
	async set(key, value) {
		if(this.cache.get(key) === value) return;
		this.cache.set(key, value);
		return this.previousOperation = new Promise(async(resolve, reject) => {
			// await previous operations (for consistency).
			await this.previousOperation;
			// find destination block.
			let id = -1;
			let fits = false;
			if(this.owners.has(key)) {
				id = this.owners.get(key);
				fits = await this.doesItemFit(id, key, value);
				if(!fits) this._delete(id, key);// delete so it can have a new owner.
			}
			if(!fits) {
				id = this.id_end;
				fits = await this.doesItemFit(id, key, value);
			}
			if(!fits) {
				id = this.appendBlock();
				fits = true;
			}
			// apply operation.
			this._set(id, key, value);
			// wait until changes are committed.
			await this.storage.flush();
			resolve(true);
		});
	}
	// delete operation.
	async delete(key) {
		if(!this.cache.has(key)) return;
		this.cache.delete(key);
		return this.previousOperation = new Promise(async(resolve, reject) => {
			// await previous operations (for consistency).
			await this.previousOperation;
			// apply operation.
			const id = this.owners.get(key);
			this._delete(id, key);
			// if block becomes too small, move keys to end (this empties said block).
			const toosmall = await this.isBlockTooSmall(id);
			if(toosmall && id < this.id_end) {
				let id_src = id;
				let id_dst = this.id_end;
				const block_src = this.blocks.get(id_src);
				const entries = [...block_src.entries()];
				let fits = true;
				for(const [k,v] of entries) {
					fits = await this.doesItemFit(id_dst, k, v);
					if(!fits) id_dst = this.appendBlock();
					this._move(id_dst, id_src, k);
				}
				// verification.
				//this.verify_moved_all_keys(id_dst, id_src, block_src);
				// replace empty block with first block (if it is not the first block).
				if(id > this.id_beg) this.replaceBlock(id);
				// else remove block (if it is not the last block).
				else if(id < this.id_end) this.removeBlock();
			}
			// wait until changes are committed.
			await this.storage.flush();
			resolve(true);
		});
	}
};



