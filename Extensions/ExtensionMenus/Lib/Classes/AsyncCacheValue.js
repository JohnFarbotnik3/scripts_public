
const AsyncCacheValue = class {
	hash			= null;
	value			= null;
	getValueHash	= null;
	getValue		= null;
	constructor(getValueHash, getValue) {
		this.getValueHash	= getValueHash;
		this.getValue		= getValue;
	}
	reset() {
		this.hash = 0;
	}
	async get(args = null) {
		const h = await this.getValueHash(args);
		//console.log("[AsyncCacheValue] get", args, h, this.hash);
		if(h !== undefined && h === this.hash) {
			const cv = this.value;
			console.debug("[AsyncCacheValue] using cached value", cv);
			return cv;
		} else {
			const v = await this.getValue(args);
			this.value = v;
			this.hash = h;
			console.debug("[AsyncCacheValue] using retrieved value", v);
			return v;
		}
	}
};

