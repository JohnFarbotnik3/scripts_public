
const AsyncCacheMap = class {
	hashes_map		= new Map();
	values_map		= new Map();
	getValueHash	= null;
	getValue		= null;
	constructor(getValueHash, getValue) {
		this.getValueHash	= getValueHash;
		this.getValue		= getValue;
	}
	reset() {
		this.hashes_map = new Map();
	}
	async get(cache_key, args = null) {
		const h = await this.getValueHash(args);
		//console.log("[AsyncCacheMap] get", cache_key, args, h, this.hashes_map.get(cache_key));
		if(h !== undefined && h === this.hashes_map.get(cache_key)) {
			const cv = this.values_map.get(cache_key);
			console.debug("[AsyncCacheMap] using cached value", cv);
			return cv;
		} else {
			const v = await this.getValue(args);
			this.values_map.set(cache_key, v);
			this.hashes_map.set(cache_key, h);
			console.debug("[AsyncCacheMap] using retrieved value", v);
			return v;
		}
	}
};

