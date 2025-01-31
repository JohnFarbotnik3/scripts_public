
function get_vid_key(url) {
	// https://www.youtube.com/watch?v=0vp6XgoUOz4&list=PLieay8-vUaFh9pWZOO553OhDF6cLNOSAr&index=2
	// https://www.youtube.com/shorts/CNkJeyttKvo
	// https://youtu.be/1hg4Dq6Pj8w
	if(url.includes("https://www.youtube.com/watch?v="))	return new URL(url).searchParams.get("v");
	if(url.includes("https://www.youtube.com/shorts/"))		return new URL(url).pathname.split("/").slice(-1)[0];
	if(url.includes("https://youtu.be/"))					return new URL(url).pathname.split("/").slice(-1)[0];
	return url;
}
function get_vid_url(url) {
	return `https://www.youtube.com/watch?v=${get_vid_key(url)}`;
}
function replace_value(old_key, new_key, value) {
	journal_ent_db_delete(old_key);
	journal_ent_db_set(new_key, value);
}

async function cleanup(text) {
	const ents_s = await journal_ent_list_site_save();
	const list_s = ents_s.filter(([k,v]) => (v?.flags & FLAG_SAVE) === FLAG_SAVE).sort((a,b) => a[1].dateUpdated - b[1].dateUpdated);
	console.debug(`[PostScript] save list - site: ${journal_site}`, ents_s.length, list_s.length, list_s);
}
//cleanup();

/*
// ============================================================
// function replacement
// ------------------------------------------------------------

let replaced_functions = {};
function replace_function(name, obj, func) {
	console.debug("[replace_function]", name);
	const [objname, funcname] = name.split(".");
	if(!replaced_functions[name]) replaced_functions[name] = obj[funcname];
	obj[funcname] = func;
}
function get_replaced_function(name) {
	return replaced_functions[name];
}

// ============================================================
// console filter
// ------------------------------------------------------------

function console_error(error, ...args) {
	console.log("[console_error]", error, args);
	const msg = error.message;
	let skip = false;
	skip |= msg.includes(`The Same Origin Policy disallows reading the remote resource at https://play.google.com/log?format=json&hasfast=true&authuser=0.`);
	if(!skip) get_replaced_function("console.error")(error, ...args);
}
replace_function("console.error", console, console_error);
*/




