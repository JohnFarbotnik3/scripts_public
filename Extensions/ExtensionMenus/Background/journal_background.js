
console.log("journal_background");

// ============================================================
// IndexedDB
// ============================================================

// journal database
let journal_db;

// constants
const DB_VERSION = 1;
const DB_NAME = "journal_db_v2";
const TRANSACTION_MODE = {
	READ_WRITE:		"readwrite",
	READ_ONLY:		"readonly",
	VERSION_CHANGE:	"versionchange",
};
const STORE_ENTRIES	= "entries";
const STORE_OBJECTS	= "objects";

// create (or open) DB
const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
openRequest.onupgradeneeded = (event) => {
	console.log("onupgradeneeded", event);
	const db = event.target.result;
	db.createObjectStore(STORE_ENTRIES, {});
	db.createObjectStore(STORE_OBJECTS, {});
};
openRequest.onerror = (event) => {
	console.error("failed to create indexedDB", event);
};
openRequest.onsuccess = (event) => {
	const db = journal_db = event.target.result;
	// log number of entries
	operation_NUM_ENTRIES(STORE_ENTRIES).then(num => console.log(`number of entries (${STORE_ENTRIES}): ${num}`));
	operation_NUM_ENTRIES(STORE_OBJECTS).then(num => console.log(`number of entries (${STORE_OBJECTS}): ${num}`));
	// Generic error handler for all errors targeted at this database's requests
	db.onerror = (event) => { console.error(`Database error: ${event.target.errorCode}`); };
};

// ============================================================
// transaction operations
// ============================================================

function operation_transaction_RO(storeName) {
	const mode = TRANSACTION_MODE.READ_ONLY;
	const transaction = journal_db.transaction([storeName], mode);
	const store = transaction.objectStore(storeName);
	return [transaction, store];
}
function operation_transaction_RW(storeName) {
	const mode = TRANSACTION_MODE.READ_WRITE;
	const transaction = journal_db.transaction([storeName], mode);
	const store = transaction.objectStore(storeName);
	return [transaction, store];
}

function operation_promise(transaction, requests) {
	transaction.commit();// manually trigger commit (optional)
	return new Promise((resolve, reject) => {
		transaction.oncomplete	= (event) => resolve(requests.map(req => req.result));
		transaction.onerror		= (event) => reject([transaction.error, requests.map(req => req.error)]);
	});
}
function operation_promise_single(transaction, request) {
	transaction.commit();// manually trigger commit (optional)
	return new Promise((resolve, reject) => {
		transaction.oncomplete	= (event) => resolve(request.result);
		transaction.onerror		= (event) => reject([transaction.error, request.error]);
	});
}

function operation_GET(storeName, keys) {
	const [transaction, store] = operation_transaction_RO(storeName);
	const requests = keys.map(k => store.get(k));
	return operation_promise(transaction, requests).then(values => values.map((value, i) => [keys[i], value]));
}
function operation_SET(storeName, ents) {
	const [transaction, store] = operation_transaction_RW(storeName);
	const requests = ents.map(([k,v]) => store.put(v,k));
	return operation_promise(transaction, requests);
}
function operation_DEL(storeName, keys) {
	const [transaction, store] = operation_transaction_RW(storeName);
	const requests = keys.map(k => store.delete(k));
	return operation_promise(transaction, requests);
}
function operation_ALL_KEYS(storeName) {
	const [transaction, store] = operation_transaction_RO(storeName);
	const request = store.getAllKeys();
	return operation_promise_single(transaction, request);
}
function operation_ALL_ENTRIES(storeName) {
	const [transaction, store] = operation_transaction_RO(storeName);
	return new Promise((resolve, reject) => {
		const entries = [];
		store.openCursor().onsuccess = (event) => {
			const cursor = event.target.result;
			if(cursor) {
				entries.push([cursor.key, cursor.value]);
				cursor.continue();
			}
			else resolve(entries);
		};
	});
}
function operation_NUM_ENTRIES(storeName) {
	const [transaction, store] = operation_transaction_RO(storeName);
	const request = store.count();
	return operation_promise_single(transaction, request);
}

// ============================================================
// storage interfaces
// ============================================================

// storage interface: journal entries
function ent_op_get(keys) { return operation_GET(STORE_ENTRIES, keys); }
function ent_op_set(ents) { return operation_SET(STORE_ENTRIES, ents); }
function ent_op_del(keys) { return operation_DEL(STORE_ENTRIES, keys); }
function ent_op_AK() { return operation_ALL_KEYS(STORE_ENTRIES); }
function ent_op_AE() { return operation_ALL_ENTRIES(STORE_ENTRIES); }
const ent_storageInterface = new StorageInterfaceServer(
	ent_op_get,
	ent_op_set,
	ent_op_del,
	ent_op_AK,
	ent_op_AE
);
function ent_handleMessage(data) { return ent_storageInterface.onRequest(data); }
const ent_messenger = new TabMessengerServer("Journal_StorageInterface_Entries", ent_handleMessage);

// storage interface: object storage
function obj_op_get(keys) { return operation_GET(STORE_OBJECTS, keys); }
function obj_op_set(ents) { return operation_SET(STORE_OBJECTS, ents); }
function obj_op_del(keys) { return operation_DEL(STORE_OBJECTS, keys); }
function obj_op_AK() { return operation_ALL_KEYS(STORE_OBJECTS); }
function obj_op_AE() { return operation_ALL_ENTRIES(STORE_OBJECTS); }
const obj_storageInterface = new StorageInterfaceServer(
	obj_op_get,
	obj_op_set,
	obj_op_del,
	obj_op_AK,
	obj_op_AE
);
function obj_handleMessage(data) { return obj_storageInterface.onRequest(data); }
const obj_messenger = new TabMessengerServer("Journal_StorageInterface_Objects", obj_handleMessage);



