
async function hash_ui8(ui8) {
	const buf = await window.crypto.subtle.digest("SHA-256", ui8);
	const arr = new Uint32Array(buf);
	const u64 = BigInt(arr[1]) << 32n | BigInt(arr[0]);
	const hash = `0x${u64.toString(16)}`;
	return hash;
}
async function hash_str(str) {
	const ui8 = new TextEncoder().encode(str);
	return hash_ui8(ui8);
}
async function hash_blob(blob) {
	const ui8 = new Uint8Array(await blob.arrayBuffer());
	return hash_ui8(ui8);
}



