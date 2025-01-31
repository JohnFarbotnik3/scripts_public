
const download_messenger = new TabMessengerClient("Download_Message");
function download_message(msg) { return download_messenger.sendMessage(msg); }

async function resolveDownload(response) {
	const { downloadId, result, downloadItem } = response;
	return new Promise(async (resolve, reject) => {
		console.debug("resolveDownload", response);
		if(result === "complete")		resolve(response);
		if(result === "interrupted")	reject(response);
	});
}

async function downloadFile(directory, filename, url) {
	console.debug("[downloadFile](directory, filename, url)", `FD: ${directory}`, `FN: ${filename}`, `URL: ${url}`);
	return resolveDownload(await download_message({ directory, filepath:filename, url, action: "file" }));
}

async function downloadFileProxy(directory, filename, url) {
	const options={}, useCache=false, useProxy=true;
	const resp = await custom_fetch(url, options, useCache, useProxy);
	return await downloadResp(directory, filename, resp);
}

async function downloadData(directory, filename, data) {
	console.debug("[downloadData](directory, filename, data)", directory, filename, data.length);
	return resolveDownload(await download_message({ directory, filepath:filename, data, action: "data" }));
}

async function downloadResp(directory, filename, resp) {
	console.debug("[downloadResp](directory, filename, resp)", directory, filename, resp);
	return downloadData(directory, filename, await resp.arrayBuffer());
}

async function downloadBlob(directory, filename, blob) {
	console.debug("[downloadBlob](directory, filename, blob.size)", directory, filename, blob.size);
	// EXPERIMENTAL: directly transfer blob to background.
	// (result: far less RAM used during 800MiB test)
	return downloadData(directory, filename, blob);
}

async function downloadBlobURL(directory, filename, blob_url) {
	console.debug("[downloadBlobURL](directory, filename, blob_url)", directory, filename, blob_url);
	const resp = await fetch(blob_url);
	return downloadData(directory, filename, await resp.arrayBuffer());
}

async function getMostRecentDownloadChange() {
	return await download_message({ action: "recentChange" });
}

