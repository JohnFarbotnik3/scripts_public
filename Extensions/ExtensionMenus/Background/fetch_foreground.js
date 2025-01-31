
// ==================================================
// response caching
// --------------------------------------------------

function session_has_response(key) {
	return Boolean(sessionStorage.getItem(key));
}
async function session_get_response(key) {
	const item = sessionStorage.getItem(key);
	let resp = null;
	if(item) {
		const b64 = item;
		const ui8 = await decode_b64_to_ui8(b64);
		resp = new Response(ui8.buffer);
	}
	console.debug(`[session_get_response(key)]`, key, resp);
	return resp;
}
async function session_set_response(key, resp) {
	console.debug(`[session_set_response(key)]`, key, resp);
	const buf = await resp.arrayBuffer();
	const ui8 = new Uint8Array(buf);
	const b64 = await encode_ui8_to_b64(ui8);
	sessionStorage.setItem(key, b64);
}

// ==================================================
// fetch functions
// --------------------------------------------------

const fetch_messenger = new TabMessengerClient("Fetch_Message");
function fetch_message(msg) { return fetch_messenger.sendMessage(msg); }

async function custom_fetch(url, options={}, useCache=true, useProxy=false) {
	console.debug("[custom_fetch]", url, options, useCache, useProxy);
	const key = `fetch_cache_${url}`;
	let resp;
	if(useCache && session_has_response(key)) {
		resp = await session_get_response(key);
		console.debug("[custom_fetch] cached response", resp);
		return resp;
	}
	if(useProxy) {
		const buf = await fetch_message({url, options, action: "proxy"});
		resp = new Response(buf);
	} else {
		resp = await fetch(url, options);
	}
	console.debug("[custom_fetch] fetched response", resp);
	if(useCache) await session_set_response(key, resp.clone());
	return resp;
}



