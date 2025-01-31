
console.log("<> background");

// handle download changes
const download_result_resolve_map = new Map();// Map<downloadId, resolve>
browser.downloads.onChanged.addListener(download_handle_changed);
function download_handle_changed(downloadDelta) {
	console.debug("[download_background] download_handle_changed(downloadDelta)", downloadDelta);
	const { id, state } = downloadDelta;
	if(!download_result_resolve_map.has(id)) return;// ignore downloads not managed by this utility
	if(state?.current === "complete" || state?.current === "interrupted")	{
		console.debug("[download_background] download_handle_changed(id, state.current)", id, state.current);
		const resolve = download_result_resolve_map.get(id);
		resolve(state.current);
		download_result_resolve_map.delete(id);
	}
}

// start download, and return relevant objects upon completion
let recentChange = null;
async function start_download(options) {
	recentChange = { date: Date.now(), options, text: "pre-start" };
	const downloadId = await browser.downloads.download(options);
	recentChange = { date: Date.now(), options, text: "started" };
	console.debug("[download_background] downloadId", downloadId);
	const result = await new Promise((resolve, reject) => download_result_resolve_map.set(downloadId, resolve));
	recentChange = { date: Date.now(), options, text: "result" };
	const arr = await browser.downloads.search({id: downloadId});
	const downloadItem = arr[0];
	recentChange = { date: Date.now(), options, text: "done" };
	return { downloadId, result, downloadItem };
}

// handle download message
const download_messenger = new TabMessengerServer("Download_Message", download_handle_message);
async function download_handle_message(msg) {
	try {
		let { action, directory, filepath, url, data } = msg;
		console.debug("[download_handle_message]", directory, filepath, url);
		directory = directory.trim();
		filepath = filepath.trim().split("/").map(s => s.trim()).join("/");
		const filename = `${directory}${directory?"/":""}${getFilenameCleaned(filepath)}`;
		console.debug("[download_handle_message] cleaned filename", filename, filename.split("").map(c => c.charCodeAt(0)));
		let downloadId = null;
		if(action === "file") {
			const options = {filename, saveAs: false, url};
			return start_download(options);
		}
		if(action === "data") {
			const blob = new Blob([data], {type: "application/octet-stream"});
			const blobURL = URL.createObjectURL(blob);
			const options = {filename, saveAs: false, url: blobURL};
			// wait, then revoke url to free memory.
			// TODO - detect when download has completed, then revoke url properly
			setTimeout(() => URL.revokeObjectURL(blobURL), 60*1000);
			return start_download(options);
		}
		if(action === "recentChange") return recentChange;
	} catch(error) {
		console.error("[download_handle_message]", msg, error);
		return error;
	}
}

