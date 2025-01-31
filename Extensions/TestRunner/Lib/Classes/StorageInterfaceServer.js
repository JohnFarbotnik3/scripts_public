
class StorageInterfaceServer {
	constructor(
		getFunc,
		setFunc,
		delFunc,
		allKeysFunc,
		allEntsFunc
	) {
		this.getFunc		= getFunc;		// func(keys) -> [key, value]
		this.setFunc		= setFunc;		// func(entries)
		this.delFunc		= delFunc;		// func(keys)
		this.allKeysFunc	= allKeysFunc;	// func() -> [key]
		this.allEntsFunc	= allEntsFunc;	// func() -> [key, value]
	}
	// cache
	dbHash = 0;// hash for detecting any change in db
	cachedHashes = new Map();// map <key, hash>
	cachedValues = new Map();// map <key, value>
	cachedKeys   = new Set();// set <key>
	getCached(keys) {
		const found = [];
		for(const k of keys) if(this.cachedValues.has(k)) arr.push([k, this.cachedHashes.get(k), this.cachedValues.get(k)]);
		return found;// [key, hash, value]
	}
	setCached(ents) {
		const changed = [];
		for(const [k,v] of ents) {
			const oldh = this.cachedHashes.has(k) ? this.cachedHashes.get(k) : 0;
			const oldv = this.cachedValues.get(k);
			if(v === oldv) continue;// skip if value is the same
			const h = oldh + 1;
			this.cachedHashes.set(k,h);
			this.cachedValues.set(k,v);
			this.cachedKeys  .add(k);
			changed.push([k,h]);
		}
		if(changed.length > 0) this.dbHash++;
		return changed;// [key, hash]
	}
	delCached(keys) {
		const deleted = [];
		for(const k of keys) {
			if(!this.cachedValues.has(k)) continue;// skip if no value found
			this.cachedHashes.delete(k);
			this.cachedValues.delete(k);
			this.cachedKeys  .delete(k);
			deleted.push(k);
		}
		if(deleted.length > 0) this.dbHash++;
		return deleted;// [key]
	}
	async loadRequiredEntries(keys) {
		const required = [];
		for(const k of keys) if(!this.cachedValues.has(k)) required.push(k);
		if(required.length > 0) {
			const ents = await this.getFunc(keys);
			this.setCached(ents);
		}
	}
	// indices
	keyIndices = new Map();// map <indexName, FilterConditionMap>	note: these indices have only key conditions
	entIndices = new Map();// map <indexName, FilterConditionMap>	note: these indices have value conditions
	updateInKeyIndices(keys) { for(const index of this.keyIndices.values()) for(const  k    of keys) index.set(k,true); }
	deleteInKeyIndices(keys) { for(const index of this.keyIndices.values()) for(const  k    of keys) index.delete(k); }
	updateInEntIndices(ents) { for(const index of this.entIndices.values()) for(const [k,v] of ents) index.set(k,v); }
	deleteInEntIndices(keys) { for(const index of this.entIndices.values()) for(const  k    of keys) index.delete(k); }
	getIndex(indexName) {
		if(this.keyIndices.has(indexName)) return this.keyIndices.get(indexName);
		if(this.entIndices.has(indexName)) return this.entIndices.get(indexName);
		return null;
	}
	// load all
	loadedAllEnts = false;
	loadedAllKeys = false;
	async loadAllEnts() {
		if(this.loadedAllEnts) return;
		const ents = await this.allEntsFunc();
		this.setCached(ents);
		this.updateInEntIndices(ents);
		this.updateInKeyIndices(ents.map(([k,v]) => k));
		this.loadedAllEnts = true;
		this.loadedAllKeys = true;
	}
	async loadAllKeys() {
		if(this.loadedAllKeys) return;
		const keys = await this.allKeysFunc();
		for(const k of keys) this.cachedKeys.add(k);
		this.updateInKeyIndices(keys);
		this.loadedAllKeys = true;
	}
	// process request and give response
	// NOTE: for thread-safety, only allow one message at-a-time.
	// IDEA: WaitConditions could be used to implement mutexes.
	async onRequest(msg) {
		const {
			HSH, 		// [key]
			GET, 		// [key]
			SET, 		// [key, value]
			DEL, 		// [key]
			ALL_KEYS,	// true | false
			ALL_ENTS,	// null | [key, hash]
			DB_HASH,	// true | false
			IND_CREATE,	// [indexName, filterMapProps]
			IND_HASH,	// [indexName]
			IND_KEYS,	// [indexName]
		} = msg;
		console.log("[StorageInterfaceServer] request", msg);
		// ------------------------------------------------------------
		// stage 1: schedule required GET,SET,DEL operations
		const qget = new Set();// Set<key>
		const qset = new Map();// Map<key, value>
		const qdel = new Set();// Set<key>
		if(HSH) for(const  k    of HSH) qget.add(k);
		if(GET) for(const  k    of GET) qget.add(k);
		if(SET) for(const [k,v] of SET) qset.set(k,v);
		if(DEL) for(const  k    of DEL) qdel.add(k);
		if(ALL_ENTS) { await this.loadAllEnts(); qget.clear(); }
		if(ALL_KEYS) { await this.loadAllKeys(); }
		// ------------------------------------------------------------
		// stage 2: create any requested indices, then populate them
		const indstatus   = [];// [indexName, hash, status]
		const indcreatedE = [];// [indexName, ind]
		const indcreatedK = [];// [indexName, ind]
		// create indices
		if(IND_CREATE) {
			for(const [name, props] of IND_CREATE) {
				const ind = new FilterConditionMap(...props);
				let s_ind = null;
				let s_msg = "";
				if(!s_ind && this.entIndices.has(name)) { s_ind = this.entIndices.get(name); indstatus.push([name, s_ind.status, "index already exists (ent)"]); }
				if(!s_ind && this.keyIndices.has(name)) { s_ind = this.keyIndices.get(name); indstatus.push([name, s_ind.status, "index already exists (key)"]); }
				if(!s_ind && ind.hasValConditions) { s_ind = ind; this.entIndices.set(name, ind); indcreatedE.push([name, ind]); }
				if(!s_ind && ind.hasKeyConditions) { s_ind = ind; this.keyIndices.set(name, ind); indcreatedK.push([name, ind]); }
				if(!s_ind) { indstatus.push([name, -1, "failed to find or create index"]); }
			}
		}
		// populate new indices
		if(indcreatedE.length > 0) {
			await this.loadAllEnts(); qget.clear();
			for(const [name, ind] of indcreatedE) {
				for(const [k,v] of this.cachedValues.entries()) ind.set(k,v);
				indstatus.push([name, ind.status, "created new index (ent)"]);
			}
		}
		if(indcreatedK.length > 0) {
			await this.loadAllKeys();
			for(const [name, ind] of indcreatedK) {
				for(const k of this.cachedKeys.keys()) ind.set(k,true);
				indstatus.push([name, ind.status, "created new index (key)"]);
			}
		}
		// ------------------------------------------------------------
		// stage 3: populate responses to all requests
		let response = {};
		// [hash] --> ordered
		if(HSH) {
			await this.loadRequiredEntries(HSH);
			response.HSH = HSH.map(k => this.cachedHashes.get(k));
		}
		// [key, hash, value]
		if(GET) {
			await this.loadRequiredEntries(GET);
			response.GET = GET.map(k => [k, this.cachedHashes.get(k), this.cachedValues.get(k)]);
		}
		// [key, hash]
		if(SET) {
			const changed = this.setCached(SET);
			const entries = changed.map(([k,h]) => [k, this.cachedValues.get(k)]);
			this.updateInEntIndices(entries);
			this.updateInKeyIndices(entries.map(([k,v]) => k));
			await this.setFunc(entries);
			response.SET = changed;
		}
		// [key]
		if(DEL) {
			const deleted = this.delCached(DEL);
			this.deleteInEntIndices(deleted);
			this.deleteInKeyIndices(deleted);
			await this.delFunc(deleted);
			response.DEL = deleted;
		}
		// [key]
		if(ALL_KEYS) response.ALL_KEYS = [...this.cachedKeys.keys()];
		// [key, hash, value]
		if(ALL_ENTS) {
			const clientKH = new Map();
			const serverKH = [];
			for(const [k,h] of ALL_ENTS) clientKH.set(k,h);
			// only include entries that are missing from request, or are outdated on client-side
			for(const [k,h] of this.cachedHashes.entries()) if(clientKH.get(k) !== h) serverKH.push([k,h]);
			response.ALL_ENTS = serverKH.map(([k,h]) => [k, h, this.cachedValues.get(k)]);
		}
		// hash
		if(DB_HASH) response.DB_HASH = this.dbHash;
		// [indexName, hash, status]
		if(IND_CREATE) if(indstatus.length > 0) response.IND_CREATE = indstatus;
		// [indexName, hash]
		if(IND_HASH) response.IND_HASH = IND_HASH.map(
			name => { const ind = this.getIndex(name); return [name, (ind ? ind.state : null)]; }
		);
		// [indexName, hash, keys]
		if(IND_KEYS) response.IND_KEYS = IND_KEYS.map(
			name => { const ind = this.getIndex(name); return [name, (ind ? ind.state : null), (ind ? [...ind.keys()] : null)]; }
		);
		// return response
		console.log("[StorageInterfaceServer] response", response);
		return response;
	}
};



