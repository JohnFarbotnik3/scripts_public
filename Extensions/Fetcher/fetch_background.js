
const pathReplacePairs = [["/","_"],["\\","_"],["{","_"],["}","_"],["*","_"],["\n","_"],["\t","_"],["=","_"],[":","_"],["?","_"],["<","_"],[">","_"],["\"","_"],["|","_"],["【"," ["],["】","] "],];
const cleanFilename = (str) => { pathReplacePairs.forEach(([a,b]) => str = str.replaceAll(a,b)); return str; }

// save chunks if a file with matching data hasn't already been saved
const save_unique_chunks_map = new Map();// map: <blob_hash, downloadId>
async function save_unique_chunks(chunks, filename) {
	const blob = new Blob(chunks);
	const blob_hash = await hash_blob(blob);
	if(!save_unique_chunks_map.has(blob_hash)) {
		save_unique_chunks_map.set(blob_hash, -1);// to prevent download duplicate spam
		console.log("download", filename, blob_hash, blob.size);
		const blob_url = URL.createObjectURL(blob);
		const options = {url: blob_url, filename, saveAs: false};
		const downloadIdPromise = browser.downloads.download(options).then(dwn_id => {
			browser.downloads.erase({id: dwn_id});
			save_unique_chunks_map.set(blob_hash, dwn_id);// update download id
			URL.revokeObjectURL(blob_url);
		}).catch(err => {
			console.error(err);
			save_unique_chunks_map.delete(blob_hash);// allow download re-attempt
			URL.revokeObjectURL(blob_url);
		});
	} else console.log("skip", filename);
}

// save chunks from fetch request
async function save_chunks_func(requestDetails, chunks) {
	const {requestId, url, originUrl, documentUrl} = requestDetails;
	console.log("requestDetails", requestDetails);
	try {
		const location = new URL(url);
		const host = cleanFilename(location.hostname);
		const path = cleanFilename(location.pathname).substring(1);
		const document = documentUrl ?? originUrl;
		const doc_host = cleanFilename(document ? (new URL(document).hostname) : host);
		let filename = `fetch/${doc_host}/${host}/${path}`;
		// handle youtube video playback chunks
		if(location.hostname.includes("googlevideo.com") && location.searchParams.get("rn")) {
			const seg = location.searchParams.get("rn");
			location.searchParams.delete("rn");// remove search param for saved text
			await save_unique_chunks([location.toString()], filename+".txt");// save request data
			await save_unique_chunks(chunks, filename + "_" + seg);
			return;
		}
		// default behaviour
		await save_unique_chunks(chunks, filename);
	} catch(err) {
		console.error(err);
	}
}

// see:
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Intercept_HTTP_requests
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/filterResponseData
function filterFetch(requestDetails) {
	//console.log(`Loading`, requestDetails);
	const {requestId, url} = requestDetails;
	let filter = browser.webRequest.filterResponseData(requestId);
	let chunks = []; 
	filter.ondata = (event) => {
		// array buffer containing event data
		const data = event.data;
		// pass data along
		filter.write(data);
		// accumulate data chunks
		chunks.push(data);
	};
	filter.onstop = (event) => {
		// The extension should always call filter.close() or filter.disconnect()
		// after creating the StreamFilter, otherwise the response is kept alive forever.
		// If processing of the response data is finished, use close. If any remaining
		// response data should be processed by Firefox, use disconnect.
		filter.close();
		save_chunks_func(requestDetails, chunks);
	};
	filter.onerror = (event) => {
		filter.close();
		console.error(event);
	};
}

browser.webRequest.onBeforeRequest.addListener(
	filterFetch,
	{ urls: ["<all_urls>"] },
	["blocking"]
);



