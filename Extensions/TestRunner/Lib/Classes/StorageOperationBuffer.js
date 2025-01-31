
class StorageOperationBuffer {
	constructor(storageCallbacks, debounceTime) {
		this.callbacks = storageCallbacks;
		this.debounce = new Debounce(debounceTime, {args:this, func:this.commit});
		this._pendingOperations = new FalseyWaitCondition(false);
		this.qset = new Map();
		this.qdel = new Set();
	}
	get pendingOperations() {
		return this._pendingOperations.wait();
	}
	async get(key) {
		await this.pendingOperations;
		const {args, fget, fset, fdel} = this.callbacks;
		return fget(args, key);
	}
	set(key, value) {
		this.qset.set(key, value);
		this.qdel.delete(key);
		this.debounce.trigger();
		this._pendingOperations.set(true);
	}
	delete(key) {
		this.qset.delete(key);
		this.qdel.add(key);
		this.debounce.trigger();
		this._pendingOperations.set(true);
	}
	async commit(_this) {
		console.debug("[StorageOperationBuffer] starting commit", [..._this.qset.entries()], [..._this.qdel.keys()]);
		const {args, fget, fset, fdel} = _this.callbacks;
		const ops = [];
		for(const [k,v] of _this.qset.entries()) ops.push(fset(args, k, v));
		for(const  k    of _this.qdel.keys()   ) ops.push(fdel(args, k));
		for(const op of ops) await op;
		// remember to clear queues!!!
		_this.qset.clear();
		_this.qdel.clear();
		_this._pendingOperations.set(false);
		console.debug("[StorageOperationBuffer] finished commit");
	}
};

