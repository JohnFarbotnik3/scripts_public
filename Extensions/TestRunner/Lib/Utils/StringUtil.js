
// ========================================================
// get and replace
// ========================================================

// get string between substrings A and B
function strBetween(str, A, B) {
    const beg = str.indexOf(A, 0) + A.length;
    const end = str.indexOf(B, beg);
    return str.substring(beg, (end > beg) ? end : str.length);
}

// replace content between delimeters
function strReplaceBetween(str, A, B, rep) {
	const ia = str.indexOf(A);
	const ib = str.indexOf(B, ia);
	if(ia < 0 || ib < 0) return str;
	return str.substring(0, ia + A.length) + rep + str.substring(ib);
}

// replace content between delimeters or append if not found
function strReplaceBetweenOrAppend(str, A, B, rep, app) {
	return (str.includes(A) && str.includes(B))
		? strReplaceBetween(str, A, B, rep)
		: str + app + A + rep + B;
}

// remove strings in arr from str
function strRemoveAll(str, arr) {
    for(let i=0;i<arr.length;i++) str = str.replaceAll(arr[i], "");
    return str;
}

// replace strings in str with array pairs
function strReplaceAll(str, pairs) {
	pairs.forEach(pair => { str = str.replaceAll(pair[0], pair[1]); });
	return str;
}

// convert string to title-case
function strToTitleCase(str) {
	str = str.replaceAll("_", " ");
	const arrTC = [" ", "("];
	arrTC.forEach(j => {
		str = str.split(j).map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(j);
	});
	str = str.trim();
	return str;
}

function strIncludesOne(str, arr) {
	let i = 0;
	arr.forEach(s => { i += str.includes(s) ? 1 : 0; });
	return i >= 1;
}

function strIncludesAll(str, arr) {
	let i = 0;
	arr.forEach(s => { i += str.includes(s) ? 1 : 0; });
	return i == arr.length;
}

function splitBySubstrings(str, subs=[]) {
	let i = 0;
	let s = [];
	for(sub of subs) {
		const a = str.indexOf(sub, i);
		const b = a + sub.length;
		s.push(str.substring(i,a));
		i = b;
	}
	s.push(str.substring(i));
	return s;
}

// ========================================================
// path and URL helpers
// ========================================================

// TODO - move to <util_url.js>

// TODO - rename this util to <util_string.js>

var getHostname = () => location.hostname;
var getPathname = () => location.pathname;
var getPathnameSegments = (str = location.pathname) => str.split("/").slice(1);
var getSearchParameters = (str = location.search) => new URLSearchParams(str);

function getUrlParts(url) {
	// "chrome://browser/content/blanktab.html?abc=123&def=456"
	const pars		= url.split("?")[1];			// "abc=123&def=456"
	const full		= url.split("?")[0];			// "chrome://browser/content/blanktab.html"
	const protocol	= full.split("//")[0];			// "chrome:"
	const loc		= full.split("//")[1];			// "browser/content/blanktab.html"
	const host		= loc.split("/")[0];			// "browser"
	const path		= loc.substring(host.length);	// "/content/blanktab.html"
	return { pars, host, path };
}

var pathReplacePairs = [
	["/","_"],["\\","_"],["{","_"],["}","_"],["*","_"],["\n","_"],["\t","_"],["=","_"],[":","_"],["?","_"],["<","_"],[">","_"],
	["\"","_"],["|","_"],["【"," ["],["】","] "], ["…","..."], [String.fromCharCode(160), " "]];

var getFilenameCleaned = (str) => convert_special_utf8_to_normal_utf8(strReplaceAll(str, pathReplacePairs));

function getFilenameFromUrl(url) {
	const path = getUrlParts(url).path;
	const seg0 = getPathnameSegments(path).slice(-1)[0];// ...abc/file.mp4
	const seg1 = getPathnameSegments(path).slice(-2)[0];// ...abc/file.mp4/?xyz=123
	const name = seg0.length > 0 ? seg0 : seg1;
	const fname = getFilenameCleaned(name);
    return fname;
}

function urlRemoveSearchParams(url, params) {
	const url_obj = new URL(url);
	params.forEach(str => url_obj.searchParams.delete(str));
	return url_obj.toString();
}

// search params
let getParamFromUrl = (url, par) => {
	const loc = new URL(url);
	return loc.searchParams.get(par);
}
let getUrlWithParam = (url, par, val) => {
	const loc = new URL(url);
	if(val) loc.searchParams.set(par,val);
	else loc.searchParams.delete(par);
	return loc.toString();
};
function getURLWithParams(url, kv_pairs) {
	const loc = new URL(url);
	for(const [k,v] of kv_pairs) {
		if(v) loc.searchParams.set(k,v);
		else loc.searchParams.delete(k);
	}
	return loc.toString();
}


// ========================================================
// date helpers
// ========================================================

function getDateString(date) {
	const y = date.getFullYear();
	const m = date.getMonth() + 1;
	const d = date.getDate();
	return [""+y, ""+(m<10?"0":"")+m, ""+(d<10?"0":"")+d].join("-");
}

// ========================================================
// misc
// ========================================================

function copyToClipboard(str) {
	navigator.clipboard.writeText(str);
}

function getDocumentHTML() {
	return document.documentElement.outerHTML;
	//return document.children[0].outerHTML;
}

// extract a single element from an array and return it
function arraySplice(arr, ind) {
	return arr.splice(ind, 1)[0];
}

function stringToDataURI(str) {
	// btoa: string -> base64
	// atob: base64 -> string
	//return "data:text/plain;base64," + btoa(encodeURI(str));
	return "data:," + encodeURI(str);
}







