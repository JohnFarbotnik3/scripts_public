
// ============================================================
// Conversions
// ============================================================

// WARNING: some characters and sequences of ui8 are not valid in utf-8 so thses conversion functions are not symmetric!
// NOTE: JSON.stringify output is probably safe though
// TODO: test u16 variant for symmetry
function str_to_ui8(str) { return new TextEncoder().encode(str); }
function ui8_to_str(ui8) { return new TextDecoder().decode(ui8); }

function str_to_u16(str) { return new TextEncoder('utf-16le').encode(str); }
function u16_to_str(u16) { return new TextDecoder('utf-16le').decode(u16); }

function obj_to_ui8(obj) { return new TextEncoder().encode(JSON.stringify(obj)); }
function ui8_to_obj(ui8) { return JSON.parse(new TextDecoder().decode(ui8));}

function ui8_to_blob(ui8) { return new Blob([ui8]); }
async function blob_to_ui8(blob) { return new Uint8Array(await blob.arrayBuffer()); }

function obj_to_blob(obj) { return ui8_to_blob(obj_to_ui8(obj)); }
async function blob_to_obj(blob) { return ui8_to_obj(await blob_to_ui8(blob)); }

// base64 conversion - source:
// https://developer.mozilla.org/en-US/docs/Glossary/Base64#Solution_.232_.E2.80.93_rewriting_atob%28%29_and_btoa%28%29_using_TypedArrays_and_UTF-8
async function ui8_to_b64_url(bytes) {
	const type = "application/octet-stream";
	return await new Promise((resolve, reject) => {
		const reader = Object.assign(new FileReader(), {
			onload: () => resolve(reader.result),
			onerror: () => reject(reader.error),
		});
		reader.readAsDataURL(new File([bytes], "", { type }));
	});
}
async function b64_url_to_ui8(dataUrl) {
	const response = await fetch(dataUrl);
	const buffer = await response.arrayBuffer();
	return new Uint8Array(buffer);
}

// ============================================================
// Compression
// ============================================================

var COMPRESSION_FORMAT = { GZIP: "gzip", DEFLATE: "deflate" };

// use blob to view multiple ui8 arrays as a single array
async function concat_ui8_chunks(ui8_arrays) {
	const blob = new Blob(ui8_arrays);
	const buf = await blob.arrayBuffer();
	const ui8 = new Uint8Array(buf);
	return ui8;
}

// iterate through readable stream chunks and gather into array
async function get_stream_chunks(stream) {
	const chunks = [];
	for await (const chunk of stream) chunks.push(chunk);
	return chunks;
}

// for some reason, readable streams are not iterable in content scripts (why?)
async function get_stream_chunks_iterated(stream) {
	const reader = stream.getReader();
	const chunks = [];
	try { while (true) { const {done, value} = await reader.read(); if(done) break; else chunks.push(value); }}
	finally { reader.releaseLock(); }
	return chunks;
}

function encode_ui8_to_stream(ui8) { return new Blob([ui8]).stream().pipeThrough(new CompressionStream(COMPRESSION_FORMAT.DEFLATE)); }
function decode_ui8_to_stream(ui8) { return new Blob([ui8]).stream().pipeThrough(new DecompressionStream(COMPRESSION_FORMAT.DEFLATE)); }
async function encode_ui8(ui8) { return await concat_ui8_chunks(await get_stream_chunks(encode_ui8_to_stream(ui8))); }
async function decode_ui8(ui8) { return await concat_ui8_chunks(await get_stream_chunks(decode_ui8_to_stream(ui8))); }
async function encode_ui8_iterated(ui8) { return await concat_ui8_chunks(await get_stream_chunks_iterated(encode_ui8_to_stream(ui8))); }
async function decode_ui8_iterated(ui8) { return await concat_ui8_chunks(await get_stream_chunks_iterated(decode_ui8_to_stream(ui8))); }
async function encode_ui8_to_b64(ui8) { return await ui8_to_b64_url(await encode_ui8_iterated(ui8)); }
async function decode_b64_to_ui8(b64) { return await decode_ui8_iterated(await b64_url_to_ui8(b64)); }
async function encode_str_to_b64(str) { return await encode_ui8_to_b64(str_to_ui8(str)); }
async function decode_b64_to_str(b64) { return ui8_to_str(await decode_b64_to_ui8(b64)); }

// ============================================================
// Hashing
// ============================================================

async function hash_ui8_to_u64(ui8) {
	const buf = await window.crypto.subtle.digest("SHA-256", ui8);
	// NOTE: for some reason, BigUint64Array is restricted on some sites?
	// I construct my own 64bit number using two u32 values instead
	const arr = new Uint32Array(buf);
	const u64 = BigInt(arr[1]) << 32n | BigInt(arr[0]);
	const hash = `0x${u64.toString(16)}`;
	return hash;
}


