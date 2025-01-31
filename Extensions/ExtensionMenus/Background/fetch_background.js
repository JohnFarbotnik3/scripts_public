
// TODO:
// write a fetch-interceptor, and use a hidden media element to trigger fetch of desired media,
// then return media once full data is obtained. this can eliminate the need for a proxy server in some cases.

const fetch_messenger = new TabMessengerServer("Fetch_Message", fetch_handle_message);
async function fetch_handle_message(msg) {
	const { url, action } = msg;
	console.debug("[fetch_background]", url, action);
	if(action === "proxy") {
		try {
			const proxy_url = "http://127.0.0.1:3000";
			// console.log("test", await fetch("http://127.0.0.1:3000", {method:"POST", body:JSON.stringify({url: "https://developer.mozilla.org/"})}));
			const resp = await fetch(proxy_url, { method: "POST", mode: "cors", body: JSON.stringify({ url }) });
			console.debug("[fetch_background] proxy response", resp);
			// WARNING: do not try returning a blob derived from a response,
			// as for some reason that specific kind of blob causes code in all sorts of places
			// to fail violently in a way that produces useless message-only stack traces.
			const buf = await resp.arrayBuffer();
			return buf;
		} catch(error) {
			console.error("[fetch_background] proxy error", error);
			return null;
		}
	}
}

