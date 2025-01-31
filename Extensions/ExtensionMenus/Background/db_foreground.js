
const db_messenger = new TabMessengerClient("db_message");
function db_message(msg) { return db_messenger.sendMessage(msg); }

function db_message_create	(name			) { return db_message({ action: "create"	, data: [name] }); }
function db_message_has		(name, key		) { return db_message({ action: "has"		, data: [name, key] }); }
function db_message_get		(name, key		) { return db_message({ action: "get"		, data: [name, key] }); }
function db_message_set		(name, key, val	) { return db_message({ action: "set"		, data: [name, key, val] }); }
function db_message_delete	(name, key		) { return db_message({ action: "delete"	, data: [name, key] }); }
function db_message_count	(name			) { return db_message({ action: "count"		, data: [name] }); }
function db_message_keys	(name			) { return db_message({ action: "keys"		, data: [name] }); }
function db_message_values	(name			) { return db_message({ action: "values"	, data: [name] }); }
function db_message_entries	(name			) { return db_message({ action: "entries"	, data: [name] }); }

class ForegroundDB {
	log  (...args) { console.log  (`DB:${this.name}`, ...args); }
	error(...args) { console.error(`DB:${this.name}`, ...args); }
	constructor(name) {
		this.name = name;
		this.loaded = db_message_create(name).then(created => {
			if(created) this.log("created");
			return true;
		});
	}
	has		(key)		{ return db_message_has		(this.name, key); }
	get		(key)		{ return db_message_get		(this.name, key); }
	set		(key, val)	{ return db_message_set		(this.name, key, val); }
	delete	(key)		{ return db_message_delete	(this.name, key); }
	count	()			{ return db_message_count		(this.name); }
	keys	()			{ return db_message_keys		(this.name); }
	values	()			{ return db_message_values	(this.name); }
	entries	()			{ return db_message_entries	(this.name); }
};

class SynchronousDBWrapper {
	constructor(db) {
		this.db = db;
		this.cache = new Map();
		this.loaded = db.loaded.then(async (loaded) => {
			const [keys, vals] = await db.entries();
			for(let x=0;x<keys.length;x++) this.cache.set(keys[x], vals[x]);
			return true;
		});
	}
	has		(key)		{ return this.cache.has(key); }
	get		(key)		{ return this.cache.get(key); }
	set		(key, val)	{ this.cache.set(key, val);	this.db.set(key, val); }
	delete	(key)		{ this.cache.delete(key);	this.db.delete(key); }
	count	()			{ return this.cache.size; }
	keys	()			{ return [...this.cache.keys()]; }
	values	()			{ return [...this.cache.values()]; }
	entries	()			{ return [this.keys(), this.values()]; }
};

class CompressedDB_gz_b64 extends ForegroundDB {
	encode(val) { return encode_str_to_b64(JSON.stringify(val)); }
	decode(cmp) { return decode_b64_to_str(cmp).then(str => JSON.parse(str)); }
	get(key) {
		return new Promise(async (resolve, reject) => {
			const cmp = await super.get(key);
			const val = cmp === undefined ? undefined : await this.decode(cmp);
			resolve(val);
		});
	}
	set(key, val) {
		return new Promise(async (resolve, reject) => {
			const cmp = await this.encode(val);
			const res = await super.set(key, cmp);
			resolve(res);
		});
	}
	values() {
		return new Promise(async (resolve, reject) => {
			const cmps = await super.values();
			const vals = [];
			for(let x=0;x<cmps.length;x++) vals.push(await this.decode(cmps[x]));
			resolve(vals);
		});
	}
	entries() {
		return new Promise(async (resolve, reject) => {
			const keys = await this.keys();
			const vals = await this.values();
			resolve([keys, vals]);
		});
	}
}



