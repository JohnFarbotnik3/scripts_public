
/*
	This structure is to reduce the number of entries, as well as storage operations / IO,
	for a very large number of small key-value pairs.
	When new entries are added, they are assigned to the last block
	in the list, i.e. the 'write' block where most reads and writes are
	expected to take place, which is managed by the write buffer.
	
	WARNING: do not be impatient with this structure, wait for it to commit before
	reloading extension. I've had corrupted data multiple times now due to premature reload.
*/
class BlockListBlock {
	constructor(id) {
		this.map = new Map();	// block entries
		this.id = String(id);	// key for saving and loading
		this.size = 0;			// current size of block
	}
};
class BlockListMap {
	constructor(storageCallbacks, debounceTime, sizeEstimatorFunc, minBlockSize=2*1024, maxBlockSize=64*1024, autoLoad=true) {
		this.valueMap = new Map();			// map: <key, value> - in-memory mirror of data structure
		this.ownerMap = new Map();			// map: <key, id>    - id of block this key belongs to
		this.blockMap = new Map();			// map: <id, Block>
		this.lastId = "0";					// id of most recently created block, considered last block in the 'list'
		this.minBlockSize = minBlockSize;	// min block size (bytes) before removing block and relocating remaining entries
		this.maxBlockSize = maxBlockSize;	// max block size (bytes) before starting new block
		this.sizeFunc = sizeEstimatorFunc;	// func(key, valueBefore, valueAfter)
		this.storageOpBuffer = new StorageOperationBuffer(storageCallbacks, debounceTime);
		this.loaded = new TruthyWaitCondition(false);
		if(autoLoad) this.load();
	}
	// getters
	get map() { return this.valueMap; }
	nextIdString(id) { return String(BigInt(id) + 1n); }
	get nextId() { return this.nextIdString(this.lastId); }
	get pendingOperations() { return this.storageOpBuffer.pendingOperations; }
	// save & load
	map_to_obj(map) { return ({ type: "Map", data: [...map.entries()] }); }
	obj_to_map(obj) { return new Map(obj.data); }// NOTE: if this doesnt succeed, then something else has gone wrong.
	async saveMap(key, map) { return this.storageOpBuffer.set(key, this.map_to_obj(map)); }
	async saveArr(key, arr) { return this.storageOpBuffer.set(key, arr); }
	async loadMap(key)      { return this.obj_to_map(await this.storageOpBuffer.get(key)); }
	async loadArr(key)      { return this.storageOpBuffer.get(key); }
	async deleteArr(key)    { return this.storageOpBuffer.delete(key); }
	async deleteMap(key)    { return this.storageOpBuffer.delete(key); }
	// save & load - extras
	async saveIDs()         { return this.saveArr("BLOCK_IDS", [...this.blockMap.values()].map(block => block.id)); }
	async loadIDs()         { return this.loadArr("BLOCK_IDS"); }
	async saveBlock(block)  { return this.saveMap(block.id, block.map); }
	async deleteBlock(block){ return this.deleteMap(block.id); }
	// load all blocks
	async init() { await this.createBlock(); this.loaded.set(true); }
	async load() {
		// ensure write operations are completed first
		console.debug("[BlockListMap] waiting for pending storage operations");
		await this.pendingOperations;
		console.debug("[BlockListMap] completed storage operations");
		// clear maps
		this.valueMap.clear();
		this.ownerMap.clear();
		// begin loading blocks
		this.loaded.set(false);
		const block_ids = await this.loadIDs();
		if(block_ids) {
			// load maps
			const loads = block_ids.map(id => this.loadMap(id));
			const maps = [];
			for(const prom of loads) maps.push(await prom);
			// create and initialize block objects
			this.blockMap.clear();
			for(let i=0;i<maps.length;i++) {
				const id = block_ids[i];
				const block = new BlockListBlock(id);
				this.blockMap.set(id, block);
				// assign map
				const map = block.map = maps[i];
				// compute size, and update entry-map + ownerMap
				for(const [k,v] of map.entries()) {
					block.size += this.sizeFunc(k, undefined, v);
					this.valueMap.set(k, v);
					this.ownerMap.set(k, id);
				}
				// find largest id
				if(BigInt(id) >= BigInt(this.lastId)) this.lastId = id;
			}
			this.loaded.set(true);
		}
		else await this.init();
		console.debug("[BlockListMap] finished loading", this.blockMap.size, this.valueMap.size);
	}
	// block creation
	async createBlock() {
		const id = this.lastId = this.nextId;
		const block = new BlockListBlock(id);
		console.debug("[BlockListMap] createBlock:", block);
		this.blockMap.set(block.id, block);
		await this.saveIDs();
		await this.saveBlock(block);
	}
	async removeBlock(id) {
		// extract and remove block
		const block = this.blockMap.get(id);
		this.blockMap.delete(id);
		console.debug("[BlockListMap] removeBlock:", block);
		await this.saveIDs();
		await this.deleteBlock(block);
		// relocate remaining entries
		for(const [k,v] of block.map.entries()) {
			this.ownerMap.delete(k);
			await this.set(k, v);
		}
	}
	// operations
	has(key) { return this.valueMap.has(key); }
	get(key) { return this.valueMap.get(key); }
	async set(key, value) {
		if(!this.loaded.value) throw("BlockListMap not loaded yet");
		// get id of block that contains key, else assign to newest block
		//if(!i) ... <-- LESSON: I spent almost a full day troubleshooting the rare & elaborate bug this caused
		if(!this.ownerMap.has(key)) this.ownerMap.set(key, this.lastId);
		const id    = this.ownerMap.get(key);
		const block = this.blockMap.get(id);
		// set and update total block size
		block.size += this.sizeFunc(key, this.valueMap.get(key), value);
		    block.map.set(key, value);
		this.valueMap.set(key, value);
		await this.saveBlock(block);
		// if last block is full, create a new block
		if(id === this.lastId && block.size >= this.maxBlockSize) await this.createBlock();
	}
	async delete(key) {
		if(!this.loaded.value) throw("BlockListMap not loaded yet");
		// early return if map doesnt have key
		if(!this.valueMap.has(key)) return;
		// get id of block that contains key, and un-assign ownership
		const id    = this.ownerMap.get(key);
		const block = this.blockMap.get(id);
		this.ownerMap.delete(key);
		// delete and update total block size
		block.size += this.sizeFunc(key, this.valueMap.get(key), undefined);
		     block.map.delete(key);
		 this.valueMap.delete(key);
		await this.saveBlock(block);
		// if owning block is almost empty, remove block and re-locate any remaining entries
		if(id !== this.lastId && block.size < this.minBlockSize) await this.removeBlock(id);
	}
	// iterators
	get size() { return this.valueMap.size; }
	keys()     { return this.valueMap.keys(); }
	values()   { return this.valueMap.values(); }
	entries()  { return this.valueMap.entries(); }
};

