
class StorageInterfaceClient {
	constructor(requestFunc, throttleTime=1000, debounceTime=50) {
		this.requestFunc = requestFunc;// func(msg)
		const timerCallback = {args: this, func: this._commit};
		this.timer = new ThrottleAndDebounce(throttleTime, debounceTime, timerCallback);
	}
	// local copy of DB contents - note: hashes are used to tell if value has changed.
	cachedEntryHashes = new Map();// map <key, hash>
	cachedEntryValues = new Map();// map <key, value>
	get map() { return this.cachedEntryValues; }
	// local copy of index contents - note: hashes are used to tell if contents of index has changed.
	cachedIndexHashes = new Map();// map <(name | null), hash>
	cachedIndexKeys   = new Map();// map <(name | null), key[]>
	// entries dont need to be requested if index is indentical to its state during previous index-entry listing
	cachedIndexHashesFromPreviousUpdate = new Map();
	checkShouldGetIndexEntries(name) {
		const curr = this.cachedIndexHashes.get(name);
		const prev = this.cachedIndexHashesFromPreviousUpdate.get(name);
		if(curr !== prev) { this.cachedIndexHashesFromPreviousUpdate.set(name, curr); return true; }
		return false;
	}
	// operation promises - resolved with up-to-date cache data after response.
	getPromises = [];// [res, rej, keys][]
	setPromises = [];// [res, rej, entries][]
	delPromises = [];// [res, rej, keys][]
	hshPromises = [];// [res, rej, indexName][]
	keyPromises = [];// [res, rej, indexName][]
	valPromises = [];// [res, rej, indexName][]
	entPromises = [];// [res, rej, indexName][]
	indPromises = [];// [res, rej, indexName, filterMapProps][]
	// add to list of operation promises, and return promise.
	pushOperationPromiseS(arr, a)    { return new Promise((res, rej) => { arr.push([res, rej, a]);    this.timer.trigger(0); }); }
	pushOperationPromiseM(arr, a, b) { return new Promise((res, rej) => { arr.push([res, rej, a, b]); this.timer.trigger(0); }); }
	// get unique operations from list of operation promises.
	getOperationSetFromItems(arr) { const set = new Set(); for(const [res, rej, key]        of arr) set.add(key);        return set; }
	getOperationMapFromItems(arr) { const map = new Map(); for(const [res, rej, key, value] of arr) map.set(key, value); return map; }
	getOperationSetFromLists(arr) { const set = new Set(); for(const [res, rej, keys] of arr) for(const  k    of keys) set.add(k);   return set; }
	getOperationMapFromLists(arr) { const map = new Map(); for(const [res, rej, ents] of arr) for(const [k,v] of ents) map.set(k,v); return map; }
	// transfer operations to a new array, then clear the old one
	transferPromises(promises) {
		const arr = [];
		for(const prom of promises) arr.push(prom);
		while(promises.length > 0) promises.pop();
		return arr;
	}
	// keep track of order of SET and DEL (write) operations, as they override eathother
	wfilter = new Map();// Map<key, opcode>
	wset(ents) { for(const [k,v] of ents) this.wfilter.set(k, 1); }
	wdel(keys) { for(const  k    of keys) this.wfilter.set(k, 0); }
	// operations
	getMultiple		(keys)				{ return this.pushOperationPromiseS(this.getPromises, keys); }
	setMultiple		(entries)			{ this.wset(entries); return this.pushOperationPromiseS(this.setPromises, entries); }
	deleteMultiple	(keys)				{ this.wdel(keys);    return this.pushOperationPromiseS(this.delPromises, keys); }
	hash			(indexName = null)	{ return this.pushOperationPromiseS(this.hshPromises, indexName); }
	keys			(indexName = null)	{ return this.pushOperationPromiseS(this.keyPromises, indexName); }
	values			(indexName = null)	{ return this.pushOperationPromiseS(this.valPromises, indexName); }
	entries			(indexName = null)	{ return this.pushOperationPromiseS(this.entPromises, indexName); }
	createIndex		(indexName, props)	{ return this.pushOperationPromiseM(this.indPromises, indexName, props); }
	// single item operations
	get 	(key)			{ return this.   getMultiple([key]).then(ents => {const [k,v] = ents[0]; return v;}); }
	set 	(key, value)	{ return this.   setMultiple([[key, value]]); }
	delete 	(key)			{ return this.deleteMultiple([key]); }
	// apply accumulated operations
	async _commit(_this) { await _this.commit(); }
	async commit() {
		// ------------------------------------------------------------
		// NOTE: it is possible for promises to be added while this function is waiting for async things to happen
		// (for example awaiting a server response), so promises are first transferred to hopefully prevent that.
		const getProms = this.transferPromises(this.getPromises);
		const setProms = this.transferPromises(this.setPromises);
		const delProms = this.transferPromises(this.delPromises);
		const hshProms = this.transferPromises(this.hshPromises);
		const keyProms = this.transferPromises(this.keyPromises);
		const valProms = this.transferPromises(this.valPromises);
		const entProms = this.transferPromises(this.entPromises);
		const indProms = this.transferPromises(this.indPromises);
		// get lists of unique operations
		const qget = this.getOperationSetFromLists(getProms);// Set<key>
		const qset = this.getOperationMapFromLists(setProms);// Map<key, value>
		const qdel = this.getOperationSetFromLists(delProms);// Set<key>
		const qhsh = this.getOperationSetFromItems(hshProms);// Set<indexName>
		const qkey = this.getOperationSetFromItems(keyProms);// Set<indexName>
		const qval = this.getOperationSetFromItems(valProms);// Set<indexName>
		const qent = this.getOperationSetFromItems(entProms);// Set<indexName>
		const qind = this.getOperationMapFromItems(indProms);// Map<indexName, props>
		// temporary map for resolving index hash promises
		const hshHashes = new Map();// Map<indexName, hash>
		// ------------------------------------------------------------
		// IND_CREATE, IND_HASH, IND_KEYS, ALL_KEYS, ALL_ENTS
		// ------------------------------------------------------------
		// filter out indices that have already been created
		for(const name of qind.keys()) if(this.cachedIndexKeys.has(name)) qind.delete(name);
		// request creation of indices, then request keys from indices, and AK/AE if applicable
		if(qhsh.size + qkey.size + qval.size + qent.size + qind.size > 0) {
			// special cases: check for null-indexNames, setting AK or AE, and removing from operation-queues
			let AK = false;// if true, get all keys
			let AE = false;// if true, get all entries
			let DH = false;// if true, get global hash
			if(qhsh.has(null)) { qhsh.delete(null); DH = true; }
			if(qkey.has(null)) { qkey.delete(null); AK = true; }
			if(qval.has(null)) { qval.delete(null); AE = true; }
			if(qent.has(null)) { qent.delete(null); AE = true; }
			// send request
			const cachedKeys = [...this.cachedEntryHashes.   keys()];
			const cachedHshs = [...this.cachedEntryHashes.entries()];
			const {
				IND_CREATE,	// [indexName, hash, status]
				IND_HASH,	// [indexName, hash]
				ALL_KEYS,	// [key]
				ALL_ENTS,	// [key, hash, value]	note: should only return keys not included in request or with outdated hash
				DB_HASH,	// hash
			} = await this.requestFunc({
				IND_CREATE: [...qind.entries()],
				IND_HASH:   [...qhsh.keys(), ...qkey.keys(), ...qval.keys(), ...qent.keys()],
				ALL_KEYS:	AK,
				ALL_ENTS:	AE ? cachedHshs : null,
				DB_HASH:	DH,
			});
			// update requested indices which are outdated
			if(IND_HASH) {
				let indicesToUpdate = new Set([...qkey.keys(), ...qval.keys(), ...qent.keys()]);
				let outdatedIndices = [];
				for(const [name, hash] of IND_HASH) hshHashes.set(name, hash);
				for(const [name, hash] of IND_HASH) if(indicesToUpdate.has(name) && hash !== this.cachedIndexHashes.get(name)) outdatedIndices.push(name);
				if(outdatedIndices.length > 0) {
					// [indexName, hash, keys]
					const { IND_KEYS } = await this.requestFunc({ IND_KEYS: outdatedIndices });
					for(const [name, hash, keys] of IND_KEYS) {
						this.cachedIndexHashes.set(name, hash);
						this.cachedIndexKeys  .set(name, keys);
					}
				}
			}
			// once we have updated keys of a given index, we can service promises using standard GET requests
			for(const name of qval.keys()) if(this.checkShouldGetIndexEntries(name)) for(const k of this.cachedIndexKeys.get(name)) qget.add(k);
			for(const name of qent.keys()) if(this.checkShouldGetIndexEntries(name)) for(const k of this.cachedIndexKeys.get(name)) qget.add(k);
			// special cases
			if(ALL_KEYS) {
				const keys = cachedKeys.concat(ALL_KEYS);
				this.cachedIndexKeys.set(null, keys);
			}
			if(ALL_ENTS) {
				for(const [key, hash, value] of ALL_ENTS) {
					this.cachedEntryHashes.set(key, hash);
					this.cachedEntryValues.set(key, value);
				}
				const keys = [...this.cachedEntryValues.keys()];
				this.cachedIndexKeys.set(null, keys);
				qget.clear();// clear GET operations
			}
			if(DB_HASH) this.cachedIndexHashes.set(null, DB_HASH);
		}
		// ------------------------------------------------------------
		// GET, SET, DEL
		// ------------------------------------------------------------
		// remove redundant SET-DEL operations based on order-of-arrival
		for(const [k, op] of this.wfilter) {
			if(op === 1) qdel.delete(k);// SET happened after DEL
			if(op === 0) qset.delete(k);// DEL happened after SET
		}
		// remove redundant GET operations, which happened after SET-DEL operations
		// note: GET ops that arrived before SET-DEL should be serviced in Server before SET-DEL
		for(const [k,v] of qset.entries()) qget.delete(k);
		for(const  k    of qdel.   keys()) qget.delete(k);
		// before GET ops, get hashes and filter out entries from get-queue that are already up-to-date
		if(qget.size > 0) {
			// [hash] --> ordered
			const keys = [...qget.keys()];
			const { HSH } = await this.requestFunc({ HSH: keys });
			HSH.map((h,i) => [keys[i],h]).map(([k,h]) => { if(h === this.cachedEntryHashes.get(k)) qget.delete(k); });
		}
		// perform GET, SET, DEL operations
		if(qget.size + qset.size + qdel.size > 0) {
			let msg = {};
			if(qget.size > 0) msg.GET = [...qget.keys()];
			if(qset.size > 0) msg.SET = [...qset.entries()];
			if(qdel.size > 0) msg.DEL = [...qdel.keys()];
			const {
				GET, // [key, hash, value]
				SET, // [key, hash]
				DEL, // [key]
			} = await this.requestFunc(msg);
			if(GET) for(const [k,h,v] of GET) {
				this.cachedEntryHashes.set(k, h);
				this.cachedEntryValues.set(k, v);
			}
			if(SET) for(const [k,h  ] of SET) {
				this.cachedEntryHashes.set(k, h);
				this.cachedEntryValues.set(k, qset.get(k));
			}
			if(DEL) for(const  k      of DEL) {
				this.cachedEntryHashes.delete(k);
				this.cachedEntryValues.delete(k);
			}
		}
		// ------------------------------------------------------------
		// resolve promises
		// ------------------------------------------------------------
		for(const [res, rej, indexName] of hshProms) res(hshHashes.get(indexName));
		for(const [res, rej, indexName] of keyProms) res(this.cachedIndexKeys.get(indexName));
		for(const [res, rej, indexName] of valProms) res(this.cachedIndexKeys.get(indexName).map(k => this.cachedEntryValues.get(k)));
		for(const [res, rej, indexName] of entProms) res(this.cachedIndexKeys.get(indexName).map(k => [k, this.cachedEntryValues.get(k)]));
		for(const [res, rej, indnm, fc] of indProms) res(true);
		for(const [res, rej, keys] of getProms) res(keys.map(k => [k, this.cachedEntryValues.get(k)]));
		for(const [res, rej, ents] of setProms) res(true);
		for(const [res, rej, keys] of delProms) res(true);
	}
};

