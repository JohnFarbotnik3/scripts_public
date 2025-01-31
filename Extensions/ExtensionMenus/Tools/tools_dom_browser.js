
// ========================================================
// Content
// ========================================================

const dbr_menu = addMenu("dbr_menu", corner_menu, "Dom Browser");
appendStyleString(dbr_menu, "width: 30vw;");

const dbr_grid = addGrid("dbr_grid", dbr_menu, [10,3,3]);
const dbr_selector = addTextInput("dbr_selector", dbr_grid, null, `selector, example: #main div[class="abc"] div:not([class="def"])`);
const dbr_str_size = addTextInput("dbr_str_size", dbr_grid, null, "max length");
const dbr_str_area = addTextArea ("dbr_str_area", dbr_menu, null, "outer HTML");
dbr_selector.value = "body";
dbr_str_size.value = "1000";
dbr_str_area.rows = 15;
dbr_str_area.style.height = "100px";
dbr_str_area.wrap = "off";
const dbr_browse_btn = addButton("dbr_browse_btn", dbr_grid, "Browse", dbr_browse_func);
appendStyleString(dbr_browse_btn, "height: inherit;");

function dbr_truncate(str, len) {
	return (str.length <= len) ? str : (str.substring(0, len*2/3) + "\n...\n" + str.substring(str.length - len*1/3));
};

function dbr_format_html(str) {
	const arr = str.split(">").filter(s => s.length > 3).map(s => (s+">"));
	let out = "";
	let tab = "";
	arr.forEach(sub => {
		const sub2 = sub.replaceAll("\n","") + "\n";
		if(sub.includes("</")) {
			if(sub.includes("</div")) tab = tab.slice(0,-2);
			if(sub.includes("</textarea")) tab = tab.slice(0,-2);
			out += tab + sub2;
		} else {
			out += tab + sub2;
			if(sub.includes("<div")) tab += "  ";
			if(sub.includes("<textarea")) tab += "  ";
		}
	});
	return out;
};

function dbr_browse_func() {
	const sel = dbr_selector.value;
	const lim = Number(dbr_str_size.value);
	const elem = document.querySelector(sel);
	const str1 = elem.outerHTML.replaceAll(">", ">\n");
	const str2 = dbr_truncate(str1, lim);
	const str3 = dbr_format_html(str2);
	dbr_str_area.value = str3;
};



