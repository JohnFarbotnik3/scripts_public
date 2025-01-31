
// ========================================================
// search lines
// ========================================================

let tools_line_search_substring_input = null;
async function line_search_save_func(elemInp) {
	console.debug("<> line_search_save_func");
	const str = elemInp.value;
	const b64 = await encode_str_to_b64(str);
	localStorage.setItem("line_search_text", b64);
}
async function line_search_load_func(elemInp) {
	console.debug("<> line_search_load_func");
	const b64 = localStorage.getItem("line_search_text");
	if(!b64) return;
	const str = await decode_b64_to_str(b64);
	elemInp.value = str ? str : "";
}
function line_search_search_func(elemInp, elemSub, elemRes, elemNum) {
	const str = elemInp.value;
	const sub = elemSub.value.toLowerCase();
	if(sub.length < 1) return;
	const lines = str.split("\n");
	const matches = [];
	for(const line of lines) if(line.toLowerCase().includes(sub)) matches.push(line);
	elemRes.value = matches.join("\n"); 
	elemNum.innerText = `${matches.length}/${lines.length}`;
}

function line_search_init_menu() {
	const menu = addMenu("line_search_menu", corner_menu, "Line Search");
	const grid = addGrid("line_search_grid", menu, [1, 1]);
	const menu_search = addMenu("line_search_menu_search", menu, "Search Text", false); 
	const grid_search = addGrid("line_search_grid_search", menu_search, [1, 1]);
	const input_search	= addTextArea("line_search_text_search", menu_search, null, "input text to search", false);
	const input_result	= addTextArea("line_search_text_result", menu, null, "search results", false);
	const div_matches	= addTextDiv("line_search_div_matches", grid, "-/-");
	const input_substr	= addTextInput("line_search_text_substr", grid, () => line_search_search_func(
		input_search, input_substr, input_result, div_matches
	), "substring to search for");
	tools_line_search_substring_input = input_substr;
	const button_save	= addButton("line_search_button_save", grid_search, "Save", async () => line_search_save_func(input_search));
	const button_load	= addButton("line_search_button_load", grid_search, "Load", async () => line_search_load_func(input_search));
	moveElem(input_search, 100);
	moveElem(input_result, 100);
	moveElem(div_matches, 2);
	moveElem(menu_search, 2);
	appendStyleString(menu, "width: inherit;");
	appendStyleString(menu_search, "width: inherit;");
	appendStyleString(input_search, "width: inherit; height: 60px;");
	appendStyleString(input_result, "width: inherit; height: 90px;");
	line_search_load_func(input_search);// auto-load
	return menu;
}

// ========================================================
// download buttons
// ========================================================

let tools_dwn_buttons_downloaded_html = false;

let sharedObject_DWNB = null;
class SharedObject_DWNB {
	constructor(site, getters) {
		// ensure all getter properties are defined.
		this.getters	= getters;
		const {get_src, get_entry, get_name_parts} = this.getters;
		for(const [k,v] of Object.entries({get_src, get_entry, get_name_parts})) {
			if(v === undefined) throw(`${k} is ${v}`);
		}
		// ensure mandatory getters are truthy.
		if(!get_src) throw("missing getter: get_src()");
		if(!get_entry) throw("missing getter: get_entry() (i.e. journal_gatherEntryData_page)");
		// define attributes.
		this.site		= site;
		this.src		= "";
		this.owner		= "";
		this.title		= "";
		this.name		= "";
		this.ext		= "";
		this.fn			= "";
		this.fd			= "";
	}
	detectChange() {
		const {get_src, get_entry, get_name_parts} = this.getters;
		let a,b;
		a = this.src;
		b = get_src();
		if(a !== b) { console.log(`[SharedObject_DWNB.detectChange()] src: (${a}) -> (${b})`); return true; }
		return false;
	}
	init() {
		const {get_src, get_entry, get_name_parts} = this.getters;
		
		this.src = get_src();
		if(!this.src) throw("!this.src", this.src);
		
		const {owner, title} = get_entry();
		this.owner = owner;
		this.title = title;
		
		if(get_name_parts) {
			const {name, ext} = get_name_parts();
			this.name = name;
			this.ext = ext;
		} else {
			// guess name based on URL.
			const str = getFilenameFromUrl(this.src);
			const pos = str.lastIndexOf(".");
			const is_ext = (pos+4 === str.length) | (pos+5 === str.length);
			this.name = is_ext ? str.substring(0, pos) : str;
			this.ext  = is_ext ? str.substring(pos) : str;
		}
		if(!this.name) throw("!this.name", this.name);
		if(!this.ext) throw("!this.ext", this.ext);
		
		this.fn = `${this.site}_${this.name}_${this.owner} - ${this.title}${this.ext}`;
		this.fd = `videos/${this.site}`;
	}
	
	setInfoSearch(infoElem) {
		// remove certain strings.
		let filename = this.name;
		const rem = ["_Source","-360p","-480p","-720p","-1080p","_360p","_480p","_720p","_1080p"];
		for(let s of rem) filename = filename.replace(s, "");
		// populate info and search field.
		const info = filename;
		copyToClipboard(info);
		infoElem.innerText = info;
		tools_line_search_substring_input.value = filename;
		tools_line_search_substring_input.oninput(null);
	}
	setInfoFullName(infoElem) {
		const info = this.fn;
		copyToClipboard(info);
		infoElem.innerText = info;
		this.saveHTML();
	}
	saveHTML() {
		const doc = getDocumentHTML();
		const fd = this.fd;
		const fn = this.fn + ".html";
		if(!tools_dwn_buttons_downloaded_html) downloadData(fd, fn, doc).then(() => {
			tools_dwn_buttons_downloaded_html = true;
		});
	}
	saveFile(styleElem) {
		appendStyleString(styleElem, "background: #AAA; opacity: 1.0;");
		this.saveHTML();
		const fd = this.fd;
		const fn = this.fn;
		const src = this.src;
		downloadFile(fd, fn, src)
			.then (() => appendStyleString(styleElem, "background: #33A; opacity: 1.0;"))
			.catch(() => appendStyleString(styleElem, "background: #AA3; opacity: 1.0;"));
	}
};

// TODO: update callers of this function
let tools_dwn_buttons_init_itv;
async function tools_dwn_buttons_init(sitename, getters) {
	// create shared object, and begin checking for changes.
	const obj = sharedObject_DWNB = new SharedObject_DWNB(sitename, getters);
	tools_dwn_buttons_init_itv = setInterval(() => {
		if(obj.detectChange()) obj.init();
	}, 500);
	// load menu.
	const menu = addMenu("tools_dwn_buttons_menu", corner_menu, "Download Buttons", true);
	const grid = addGrid("tools_dwn_buttons_grid", menu, [1,1,1]);
	const t_info = addTextDiv("tools_dwn_buttons_postInfoText", menu, "");
	const b_sear = addButton("tools_dwn_buttons_postSear", grid, "Search name", null);
	const b_name = addButton("tools_dwn_buttons_postName", grid, "File name", null);
	const b_down = addButton("tools_dwn_buttons_postDown", grid, "Download", null);
	b_sear.onclick = (event) => obj.setInfoSearch(t_info);
	b_name.onclick = (event) => obj.setInfoFullName(t_info);
	b_down.onclick = (event) => obj.saveFile(b_down);
	appendStyleString(t_info, "width: inherit;");
	appendStyleString(grid, "width: inherit;");
	moveMenuContentsToQuickMenu(menu);
	const search_menu = line_search_init_menu();
	moveMenuContentsToQuickMenu(search_menu);
}



