
// ============================================================
// operations
// ============================================================

const journal_ent_messenger = new TabMessengerClient("Journal_StorageInterface_Entries");
const journal_obj_messenger = new TabMessengerClient("Journal_StorageInterface_Objects");
function journal_ent_message(data) { return journal_ent_messenger.sendMessage(data); }
function journal_obj_message(data) { return journal_obj_messenger.sendMessage(data); }
const journal_SI_throttle = 1000;
const journal_SI_debounce = 20;
const journal_ent_interface = new StorageInterfaceClient(journal_ent_message, journal_SI_throttle, journal_SI_debounce);
const journal_obj_interface = new StorageInterfaceClient(journal_obj_message, journal_SI_throttle, journal_SI_debounce);

// flag helpers
const FLAG_TODO = 0b001;
const FLAG_DONE = 0b010;
const FLAG_SAVE = 0b100;
function journal_entry_set_flag(entry, flag, value) {
	entry.flags = value ? (entry.flags | flag) : (entry.flags & ~flag);
}
function journal_entry_has_flag(entry, flag) {
	return entry ? ((entry.flags & flag) === flag) : false;
}

// db-key site prefix
// NOTE: any site that uses journal or indexedDB functionality should assign this value.
let journal_site = null;

// operation helpers
function to_db_key(key) { return JSON.stringify([journal_site, key]); }
const FCL_KEY_SITE = (site) => new FilterConditionList([[0, FilterConditionList.OPERATIONS.EQS, site, null]]);
const FCL_VAL_TODO = new FilterConditionList([["flags", FilterConditionList.OPERATIONS.AND, FLAG_TODO, FLAG_TODO]]);
const FCL_VAL_SAVE = new FilterConditionList([["flags", FilterConditionList.OPERATIONS.AND, FLAG_SAVE, FLAG_SAVE]]);

// helper functions for cached operations
async function _journal_cache_get_hash		(args) {
	const [storageInterface, indexName, site] = args;
	return storageInterface.hash(indexName);
}
async function _journal_cache_get_all		(args) {
	const [storageInterface, indexName, site] = args;
	return storageInterface.entries();
}
async function _journal_cache_get_site_all	(args) {
	const [storageInterface, indexName, site] = args;
	await storageInterface.createIndex(indexName, ["JSON", FCL_KEY_SITE(site), "OBJECT", null]);
	return storageInterface.entries(indexName);
}
async function _journal_cache_get_site_todo	(args) {
	const [storageInterface, indexName, site] = args;
	await storageInterface.createIndex(indexName, ["JSON", FCL_KEY_SITE(site), "OBJECT", FCL_VAL_TODO]);
	return storageInterface.entries(indexName);
}
async function _journal_cache_get_site_save	(args) {
	const [storageInterface, indexName, site] = args;
	await storageInterface.createIndex(indexName, ["JSON", FCL_KEY_SITE(site), "OBJECT", FCL_VAL_SAVE]);
	return storageInterface.entries(indexName);
}

// journal operations - entries
async function journal_ent_db_get			(db_key)		{ return journal_ent_interface.   get(db_key); }
async function journal_ent_db_set			(db_key, value)	{ return journal_ent_interface.   set(db_key, value); }
async function journal_ent_db_delete		(db_key)		{ return journal_ent_interface.delete(db_key); }
async function journal_ent_db_getMultiple	(keys)			{ return journal_ent_interface.   getMultiple(keys); }
async function journal_ent_db_setMultiple	(ents)			{ return journal_ent_interface.   setMultiple(ents); }
async function journal_ent_db_deleteMultiple(keys)			{ return journal_ent_interface.deleteMultiple(keys); }
async function journal_ent_site_get			(key)			{ return journal_ent_db_get   (to_db_key(key)); }
async function journal_ent_site_set			(key, value)	{ return journal_ent_db_set   (to_db_key(key), value); }
async function journal_ent_site_delete		(key)			{ return journal_ent_db_delete(to_db_key(key)); }
// journal operations - objects
async function journal_obj_db_get			(db_key)		{ return journal_obj_interface.   get(db_key); }
async function journal_obj_db_set			(db_key, value)	{ return journal_obj_interface.   set(db_key, value); }
async function journal_obj_db_delete		(db_key)		{ return journal_obj_interface.delete(db_key); }
async function journal_obj_db_getMultiple	(keys)			{ return journal_obj_interface.   getMultiple(keys); }
async function journal_obj_db_setMultiple	(ents)			{ return journal_obj_interface.   setMultiple(ents); }
async function journal_obj_db_deleteMultiple(keys)			{ return journal_obj_interface.deleteMultiple(keys); }
async function journal_obj_site_get			(key)			{ return journal_obj_db_get   (to_db_key(key)); }
async function journal_obj_site_set			(key, value)	{ return journal_obj_db_set   (to_db_key(key), value); }
async function journal_obj_site_delete		(key)			{ return journal_obj_db_delete(to_db_key(key)); }

// journal filtered-list operations - entries
const journal_ent_cache_list_all		= new AsyncCacheValue(_journal_cache_get_hash, _journal_cache_get_all);
const journal_ent_cache_list_site_all	= new AsyncCacheMap  (_journal_cache_get_hash, _journal_cache_get_site_all);
const journal_ent_cache_list_site_todo	= new AsyncCacheMap  (_journal_cache_get_hash, _journal_cache_get_site_todo);
const journal_ent_cache_list_site_save	= new AsyncCacheMap  (_journal_cache_get_hash, _journal_cache_get_site_save);
async function journal_ent_list_all			()	{ return journal_ent_cache_list_all.get([journal_ent_interface, null, null]); }
async function journal_ent_list_site_all	()	{ const site = journal_site; return journal_ent_cache_list_site_all .get(site, [journal_ent_interface, `site-list_${site}`, site]); }
async function journal_ent_list_site_todo	()	{ const site = journal_site; return journal_ent_cache_list_site_todo.get(site, [journal_ent_interface, `site-todo_${site}`, site]); }
async function journal_ent_list_site_save	()	{ const site = journal_site; return journal_ent_cache_list_site_save.get(site, [journal_ent_interface, `site-save_${site}`, site]); }
// journal filtered-list operations - objects
const journal_obj_cache_list_all		= new AsyncCacheValue(_journal_cache_get_hash, _journal_cache_get_all);
const journal_obj_cache_list_site_all	= new AsyncCacheMap  (_journal_cache_get_hash, _journal_cache_get_site_all);
const journal_obj_cache_list_site_todo	= new AsyncCacheMap  (_journal_cache_get_hash, _journal_cache_get_site_todo);
const journal_obj_cache_list_site_save	= new AsyncCacheMap  (_journal_cache_get_hash, _journal_cache_get_site_save);
async function journal_obj_list_all			()	{ return journal_obj_cache_list_all.get([journal_obj_interface, null, null]); }
async function journal_obj_list_site_all	()	{ const site = journal_site; return journal_obj_cache_list_site_all .get(site, [journal_obj_interface, `site-list_${site}`, site]); }
async function journal_obj_list_site_todo	()	{ const site = journal_site; return journal_obj_cache_list_site_todo.get(site, [journal_obj_interface, `site-todo_${site}`, site]); }
async function journal_obj_list_site_save	()	{ const site = journal_site; return journal_obj_cache_list_site_save.get(site, [journal_obj_interface, `site-save_${site}`, site]); }

// ============================================================
// compression and encoding operations
// ============================================================

async function journal_b64_obj_site_get		(key)			{
	const b64 = await journal_obj_site_get(key);
	return b64 ? JSON.parse(await decode_b64_to_str(b64)) : null;
}
async function journal_b64_obj_site_set		(key, value)	{
	const b64 = await encode_str_to_b64(JSON.stringify(value));
	await journal_obj_site_set(key, b64);
}
async function journal_b64_obj_site_delete	(key)			{
	await journal_obj_site_delete(key);
}

// generic site storage callbacks
async function journal_cb_b64_obj_fget(prefix, key)			{ return journal_b64_obj_site_get   (`${prefix}_${key}`); }
async function journal_cb_b64_obj_fset(prefix, key, value)	{ return journal_b64_obj_site_set   (`${prefix}_${key}`, value); }
async function journal_cb_b64_obj_fdel(prefix, key)			{ return journal_b64_obj_site_delete(`${prefix}_${key}`); }
function journal_cb_b64_obj_storage_callbacks(prefix) {
	return {
		args: prefix,
		fget: journal_cb_b64_obj_fget,
		fset: journal_cb_b64_obj_fset,
		fdel: journal_cb_b64_obj_fdel,
	};
};

// ============================================================
// import & export operations
// ============================================================

async function journal_export_entries() {
	const ents = await journal_ent_list_all();
	const str = ents.map(entry => JSON.stringify(entry)).join("\n");
	return str;
}
async function journal_import_entries(str) {
	const ents = str.split("\n").map(line => JSON.parse(line));
	await journal_ent_db_setMultiple(ents);
}

async function journal_export_objects() {
	const ents = await journal_obj_list_all();
	const str = ents.map(entry => JSON.stringify(entry)).join("\n");
	return str;
}
async function journal_import_objects(str) {
	const ents = str.split("\n").map(line => JSON.parse(line));
	await journal_obj_db_setMultiple(ents);
}

// ============================================================
// external functions
// ============================================================

let journal_getKey_url = (url) => url;

let journal_blankEntry_func = () => null;
let journal_parseEntry_func = () => null;

let journal_gatherEntryData_page = () => null;
let journal_gatherEntryData_item = (elem) => null;

// ============================================================
// helpers which require external functions
// ============================================================

async function journal_getPageEntry() {
	const url = location.toString();
	const key = journal_getKey_url(url);
	return await journal_ent_site_get(key);
}

async function journal_setPageDone(score=1) {
	const url = location.toString();
	const key = journal_getKey_url(url);
	const old_entry = await journal_ent_site_get(key) ?? null;
	const new_entry = {...journal_blankEntry_func(), ...old_entry, ...journal_gatherEntryData_page()};
	new_entry.score	= score;
	journal_entry_set_flag(new_entry, FLAG_DONE, true);
	journal_entry_set_flag(new_entry, FLAG_TODO, false);
	new_entry.dateUpdated = Date.now();
	console.log("<> entry", new_entry);
	await journal_ent_site_set(key, new_entry);
}

async function journal_setPageSave(value=true) {
	const url = location.toString();
	const key = journal_getKey_url(url);
	const old_entry = await journal_ent_site_get(key) ?? null;
	const new_entry = old_entry ?? {...journal_blankEntry_func(), ...journal_gatherEntryData_page()};
	journal_entry_set_flag(new_entry, FLAG_SAVE, value);
	new_entry.dateUpdated = Date.now();
	console.log("<> entry", new_entry);
	await journal_ent_site_set(key, new_entry);
}

async function journal_setItemTodo(elem, score=1) {
	const url = journal_gatherEntryData_item(elem).url;
	const key = journal_getKey_url(url);
	const old_entry = await journal_ent_site_get(key) ?? null;
	const new_entry = {...journal_blankEntry_func(), ...old_entry, ...journal_gatherEntryData_item(elem)};
	new_entry.score = score;
	journal_entry_set_flag(new_entry, FLAG_TODO, true);
	new_entry.dateUpdated = Date.now();
	console.log("<> entry", new_entry);
	await journal_ent_site_set(key, new_entry);
}

// ============================================================
// Entry Generators - Video
// ============================================================

function journal_blankEntry_video() {
	const score		= 1;
	const url		= "";
	const owner		= "";
	const title		= "";
	const duration	= 0;
	const postDate	= "";
	const flags		= FLAG_TODO;
	const dateCreated	= Date.now();
	const dateUpdated	= Date.now();
	const imageUrl		= "";
	return {
		score, url, title, owner, duration, postDate,
		flags, dateCreated, dateUpdated, imageUrl,
	};
}

// get simplified version of entry for putting in text files
function journal_stringEntry_video(entry) {
	const {score, url, duration, owner, title, postDate} = entry;
	// convert attributes
	const ts = buildTimestamp(duration);
	const dateNow = new Date().toISOString();
	// simplified entry
	const obj = {score, url, ts, owner, title, postDate, dateNow};
	return JSON.stringify(obj);
}

// parse simplified version of entry
function journal_parseEntry_video(str) {
	try {
		const obj = JSON.parse(str);
		// convert attributes
		if(obj.ts) obj.duration = parseTimestamp(obj.ts);
		if(obj.dateNow) obj.dateCreated = new Date(obj.dateNow);
		// attempt to copy all attributes recognized by this type of entry
		const blank = journal_blankEntry_video()
		const entry = {};
		for(attribute of Object.keys(blank)) if(obj[attribute]) entry[attribute] = obj[attribute];
		return entry;
	} catch(err) {
		console.error(err);
		return null;
	}
}



