console.log("db_background");

const STORE_NAME = "main";

class BackgroundDB {
	// ============================================================
	// Operations
	// ============================================================

	static TRANSACTION_MODE = {
		READ_WRITE:		"readwrite",
		READ_ONLY:		"readonly",
		VERSION_CHANGE:	"versionchange",
	};

	transaction_RO() {
		const transaction = this.db.transaction([STORE_NAME], BackgroundDB.TRANSACTION_MODE.READ_ONLY);
		const store = transaction.objectStore(STORE_NAME);
		return [transaction, store];
	}
	transaction_RW() {
		const transaction = this.db.transaction([STORE_NAME], BackgroundDB.TRANSACTION_MODE.READ_WRITE);
		const store = transaction.objectStore(STORE_NAME);
		return [transaction, store];
	}
	
	transaction_promise(transaction, request) {
		return new Promise((resolve, reject) => {
			transaction.oncomplete	= (event) => resolve(request.result);
			transaction.onerror		= (event) => reject([transaction.error, request.error]);
		});
	}
	
	has(key) {
		const [transaction, store] = this.transaction_RO();
		const request = store.get(key);
		return this.transaction_promise(transaction, request).then(value => value !== undefined);
	}
	get(key) {
		const [transaction, store] = this.transaction_RO();
		const request = store.get(key);
		return this.transaction_promise(transaction, request);
	}
	set(key, val) {
		const [transaction, store] = this.transaction_RW();
		const request = store.put(val, key);
		return this.transaction_promise(transaction, request);
	}
	delete(key) {
		const [transaction, store] = this.transaction_RW();
		const request = store.delete(key);
		return this.transaction_promise(transaction, request);
	}
	count() {
		const [transaction, store] = this.transaction_RO();
		const request = store.count();
		return this.transaction_promise(transaction, request);
	}
	keys() {
		const [transaction, store] = this.transaction_RO();
		const request = store.getAllKeys();
		return this.transaction_promise(transaction, request);
	}
	values() {
		const [transaction, store] = this.transaction_RO();
		const request = store.getAll();
		return this.transaction_promise(transaction, request);
	}
	entries() {
		return new Promise(async (resolve, reject) => {
			const keys = await this.keys();
			const vals = await this.values();
			resolve([keys, vals]);
		});
	}
	
	// ============================================================
	// Logging
	// ============================================================
	
	log  (...args) { console.log  (`DB:${this.name}`, ...args); }
	error(...args) { console.error(`DB:${this.name}`, ...args); }

	// ============================================================
	// Structors
	// ============================================================
	
	constructor(name, version) {
		this.name		= name;
		this.version	= version;
		this.db			= null;
		// open or create db.
		this.loaded_res = null;
		this.loaded_rej = null;
		this.loaded = new Promise((resolve, reject) => {
			this.loaded_res = resolve;
			this.loaded_rej = reject;
		});
		const openRequest = indexedDB.open(name, version);
		openRequest.onupgradeneeded = (event) => {
			this.log("onupgradeneeded", event);
			const db = event.target.result;
			db.createObjectStore(STORE_NAME, {});
		};
		openRequest.onerror = (event) => {
			this.error("failed to create indexedDB", event);
			this.loaded_rej(event);
		};
		openRequest.onsuccess = (event) => {
			this.log("onsuccess");
			const db = event.target.result;
			this.db = db;
			db.onerror = (evt) => this.error(`error: ${evt.target.errorCode}`);
			this.count().then(num => this.log(`number of entries: ${num}`));
			this.loaded_res(event);
		};
	}
};

// ============================================================
// Databases
// ============================================================

let db_list = new BackgroundDB("DB_LIST_v1", 1);
let db_list_loaded = null;
let db_list_loaded_promise = null;
let db_list_loaded_resolve = null;
let db_list_map = new Map();// Map<name, db>

let resolve;
db_list_loaded_promise = new Promise((res, rej) => { db_list_loaded_resolve = res; });
db_list.loaded.then(async() => {
	console.log("db_background: db_list loading databases");
	const [keys, vals] = await db_list.entries();
	for(let x=0;x<keys.length;x++) {
		const name = keys[x];
		const version = vals[x];
		const db = new BackgroundDB(name, version);
		db_list_map.set(name, db);
		await db.loaded;
	}
	console.log("db_background: db_list databases loaded:", keys.length);
	db_list_loaded_resolve(true);
});

const db_messenger = new TabMessengerServer("db_message", db_messenger_handler);
async function db_messenger_handler(message) {
	try {
		// wait until db list is loaded.
		if(!db_list_loaded) { await db_list_loaded_promise; db_list_loaded = true; }
		// handle message.
		let { action, data } = message;
		if(action === "create") {
			const [name] = data;
			if(db_list_map.has(name)) return false;
			else {
				const version = 1;
				const db = new BackgroundDB(name, version);
				await db.loaded;
				await db_list.set(name, version);
				db_list_map.set(name, db);
				return true;
			}
		}
		if(action === "has"		) { const [name, key]		= data;	return await db_list_map.get(name).has(key); }
		if(action === "get"		) { const [name, key]		= data;	return await db_list_map.get(name).get(key); }
		if(action === "set"		) { const [name, key, val]	= data;	return await db_list_map.get(name).set(key, val); }
		if(action === "delete"	) { const [name, key]		= data;	return await db_list_map.get(name).delete(key); }
		if(action === "count"	) { const [name]			= data; return await db_list_map.get(name).count();	}
		if(action === "keys"	) {	const [name]			= data; return await db_list_map.get(name).keys(); }
		if(action === "values"	) { const [name]			= data; return await db_list_map.get(name).values(); }
		if(action === "entries"	) { const [name]			= data; return await db_list_map.get(name).entries(); }
	} catch(error) {
		console.error("db_messenger_handler()", message, error);
		return error;
	}
}

