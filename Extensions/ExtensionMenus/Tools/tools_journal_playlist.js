
// ========================================================
// config
// ========================================================

let journal_playlist_getElem_items = () => [];
let journal_playlist_itemButton_style = "";
let journal_playlist_itemParent_style = "";

// ========================================================
// playlist table
// ========================================================

let journal_playlist_menu = null;
let journal_playlist_list = null;// container element for list of row elements
let journal_playlist_rows = null;// array of row element references
let journal_playlist_image = null;// preview image
let journal_playlist_search = null;// search input


function journal_playlist_init_rows(N) {
	const arr_rows = [];
	const id = "journal_playlist_lst";
	for(let i=0;i<N;i++) {
		const itemData = { index:i, entry:null, db_key:null };
		const elem = ComponentPlaylistItem.create({
			id: `${id}_${i}`,
			parent: journal_playlist_list,
			itemData,
			btn_skip_onclick: journal_playlist_btn_skip_onclick,
			span_div_onmouseenter: journal_playlist_span_div_onmouseenter,
			span_div_onmouseleave: journal_playlist_span_div_onmouseleave,
		});
		arr_rows.push(elem);
	}
	return arr_rows;
}
async function journal_playlist_btn_skip_onclick(itemElem) {
	const itemData = itemElem.itemData;
	if(!itemData) throw("event target does not have itemData.");
	const { entry, db_key, index } = itemData;
	entry.score -= 0.1;
	await journal_ent_db_set(db_key, entry);
	await journal_playlist_refresh_rows();
}
function journal_playlist_span_div_onmouseenter(itemElem) {
	const { index, entry, db_key } = itemElem.itemData;
	let url = entry.imageUrl ?? null;
	if(url) journal_playlist_image.style.visibility = "";
	if(url) journal_playlist_image.src = url;
};
function journal_playlist_span_div_onmouseleave(itemElem) {
	journal_playlist_image.style.visibility = "hidden";
};


let journal_playlist_date_order = 1;
let journal_playlist_inp_dur_min = null;
let journal_playlist_inp_dur_max = null;
async function journal_playlist_refresh_rows() {
	// get entries
	let tuples_todo = await journal_ent_list_site_todo();
	console.log("tuples_todo", tuples_todo);
	// filter by search string
	const substr = journal_playlist_search?.value?.toLowerCase();
	let tuples = tuples_todo;
	if(substr) tuples = tuples.filter(([k,v]) => v?.owner?.toLowerCase().includes(substr) || v?.title?.toLowerCase().includes(substr));
	// filter by duration
	const dvalue = journal_playlist_inp_dur_min?.value || journal_playlist_inp_dur_max?.value;
	const dvmin = journal_playlist_inp_dur_min?.value;
	const dvmax = journal_playlist_inp_dur_max?.value;
	const dmin = 60 * Number(dvmin ? dvmin : 0);
	const dmax = 60 * Number(dvmax ? dvmax : 24*60);
	if(dvalue) tuples = tuples.filter(([k,v]) => (dmin <= v.duration && v.duration <= dmax));
	// sort by date
	tuples.sort((a,b) => (a[1]["dateCreated"] > b[1]["dateCreated"] ? -1 : 1) * journal_playlist_date_order);
	// sort by score
	tuples.sort((a,b) => (a[1]["score"] > b[1]["score"] ? -1 : 1));
	// update rows
	for(let i=0;i<journal_playlist_rows.length;i++) {
		const rowElem = journal_playlist_rows[i];
		const [db_key, entry] = (i < tuples.length) ? tuples[i] : [null, null];
		const itemData = { index:i, entry, db_key };
		rowElem.update(itemData);
	}
}

let journal_playlist_btn_grid = null;
let journal_playlist_btn_refr = null;
let journal_playlist_btn_sort = null;


async function journal_playlist_btn_sort_date_func() {
	const order = journal_playlist_date_order *= -1;
	await journal_playlist_refresh_rows();
	journal_playlist_btn_sort.innerText = order > 0 ? "Oldest" : "Newest";
}

const journal_playlist_update_dur_debounce = new Debounce(250, {args: null, func: journal_playlist_refresh_rows});
function journal_playlist_update_dur() {
	localStorage.setItem(journal_playlist_inp_dur_min.id, journal_playlist_inp_dur_min.value);
	localStorage.setItem(journal_playlist_inp_dur_max.id, journal_playlist_inp_dur_max.value);
	journal_playlist_update_dur_debounce.trigger();
}

// ========================================================
// item entry buttons
// ========================================================

function journal_score_colour(score) {
	const colours = ["#555", "#773", "#9B9", "#ACE", "#ECE"];
	return colours[Math.min(Math.max(Math.round(score), 0), 4)];
}

// modify item styling based on item entry
async function journal_playlist_style_items(elems) {
	const pairs = [];
	for(const elem of elems) {
		const url = journal_gatherEntryData_item(elem).url;
		const key = journal_getKey_url(url);
		const ent = journal_ent_site_get(key);
		pairs.push([elem, ent]);
	}
	const unflagged = [];
	for(const [elem, ent] of pairs) {
		const entry = await ent;
		if(!entry) { unflagged.push(elem); continue; }
		if(journal_entry_has_flag(entry, FLAG_TODO)) appendStyleString(elem, `filter: brightness(70%); outline-offset: -2px; outline: 4px dashed ${journal_score_colour(entry.score)};`);
		if(journal_entry_has_flag(entry, FLAG_DONE)) appendStyleString(elem, `filter: brightness(30%);`);
	}
	// move unflagged elements to start of list
	while(unflagged.length > 0) moveElem(unflagged.pop(), -1000);
}

// add buttons for setting 'todo' flag of items
async function journal_playlist_addItemButtons() {
	const elems = journal_playlist_getElem_items();
	elems.forEach(async (elem) => {
		const url = journal_gatherEntryData_item(elem).url;
		const key = journal_getKey_url(url);
		const ent = await journal_ent_site_get(key);
		// skip element if already done
		if(journal_entry_has_flag(ent, FLAG_DONE)) return;
		// add buttons
		const func = (n) => {
			const entry = journal_gatherEntryData_item(elem);
			entry.score = n;
			const info = journal_stringEntry_video(entry) + "\n";
			copyToClipboard(info);
			link_accumulator_textarea.appendStr(info);
			journal_setItemTodo(elem, n).then(() => journal_playlist_style_items([elem]));
		};
		const grid = addGrid(`playlist_item_todo_btn_grid_${key}`, elem, [1]);
		const btns = [1,2,3].map(n => addButton(`playlist_item_todo_btn_${key}_${n}`, grid, n+"", () => func(n), () => func(n)));
		const styles = [1,2,3].map(n => `background:${journal_score_colour(n)}; width: 100%; height: auto;`);
		appendStyleString(grid,					journal_playlist_itemButton_style);
		appendStyleString(grid.parentElement,	journal_playlist_itemParent_style);
		btns.forEach((btn, i) => appendStyleString(btn, styles[i]));
	});
}

async function journal_playlist_refreshItems() {
	await journal_playlist_style_items(journal_playlist_getElem_items());
	await journal_playlist_addItemButtons();
}

// ========================================================
// page entry buttons
// ========================================================

// show info about current page entry
let page_div_entry = null;
async function journal_playlist_updatePageEntryDisplay() {
	const entry = await journal_getPageEntry();
	const elem = page_div_entry;
	if(entry) {
		const F = entry.flags;
		let flagstr = "NONE";
		let flagset = [[FLAG_TODO,"t"],[FLAG_DONE,"d"],[FLAG_SAVE,"s"]].map(([f,c]) => (F&f) ? c : '-').join("");
		//let flagclr = "#" + [F, FLAG_DONE, FLAG_SAVE].map(f => (F&f)?"ff":"aa").join("");
		if(journal_entry_has_flag(entry, FLAG_TODO)) flagstr = "todo";
		if(journal_entry_has_flag(entry, FLAG_DONE)) flagstr = "done";
		elem.innerText = `${flagstr} [${flagset} ${entry.score}], ${new Date(entry.dateUpdated).toLocaleDateString()}`;
		//elem.style.color = flagclr;
	} else {
		elem.innerText = "(no entry)";
	}
	if(journal_entry_has_flag(entry, FLAG_DONE)) clearTodoOutline(elem); else applyTodoOutline(elem);
}

// add buttons for setting 'done' flag of page entry
function journal_playlist_addPageButtons() {
	const grid = addGrid("journal_playlist_page_btn_grid", journal_playlist_menu, [1]);
	const grid1 = addGrid("journal_playlist_page_btn_grid1", grid, [2,1,1]);
	const func = (n) => {
		const entry = journal_gatherEntryData_page();
		entry.score = n;
		const info = journal_stringEntry_video(entry) + "\n";
		copyToClipboard(info);
		journal_setPageDone(n).then(() => journal_playlist_updatePageEntryDisplay());
	};
	const btns = [1,2,3].map(n => addButton(`playlist_page_done_btn_${n}`, grid1, n+"", () => func(n), () => func(n)));
	const clrs = [1,2,3].map(n => journal_score_colour(n));
	btns.forEach((btn, n) => appendStyleString(btn, `background:${clrs[n]};`));
	// additional buttons
	const grid2 = addGrid("journal_playlist_page_btn_grid2", grid, [1,1]);
	const btn_save = addButton_Cycle("page_done_save_btn", grid2, ["Save", "Don't Save"], [
		() => journal_setPageSave(1).then(() => journal_playlist_updatePageEntryDisplay()),
		() => journal_setPageSave(0).then(() => journal_playlist_updatePageEntryDisplay()),
	], ["filter:;", "filter: brightness(50%);"]);
	const page_btn_refr = addButton("journal_playlist_page_btn_refr", grid2, "Refresh items", journal_playlist_refreshItems);
	// add to quick menu
	moveToQuickMenu(grid);
	moveElem(grid, -1000);
}

// ========================================================
// init
// ========================================================

function journal_playlist_init(item_getter, item_button_style, item_parent_style) {
	console.log("<> siteutils_journal_playlist");
	journal_playlist_menu = Menu.create({
		parent: corner_menu, id: "journal_playlist_menu",
		button:	{ text: "Playlist" },
		area:	{ style: "width: 350px;" },
	});
	// config
	journal_playlist_getElem_items = item_getter;
	journal_playlist_itemButton_style = item_button_style;
	journal_playlist_itemParent_style = item_parent_style;
	// playlist rows
	journal_playlist_list = addGrid("journal_playlist_list", journal_playlist_menu, [1]);
	journal_playlist_rows = journal_playlist_init_rows(50);
	journal_playlist_image = addImage("journal_playlist_image", journal_playlist_menu, "");
	appendStyleString(journal_playlist_list, "height: 200px; overflow-y: scroll;");
	appendStyleString(journal_playlist_image, "background: #000; visibility: hidden; position: absolute; top: 0px; right: -420px; padding: 10px; width: 400px; height: 300px;");
	journal_playlist_refresh_rows();
	// playlist buttons
	const grid = journal_playlist_btn_grid = addGrid("journal_playlist_btn_grid", journal_playlist_menu, [1,1,2,0.5,0.5]);
	journal_playlist_btn_refr = addButton("journal_playlist_btn_refr", grid, "Refresh", journal_playlist_refresh_rows);
	journal_playlist_btn_sort = addButton("journal_playlist_btn_sort", grid, "Oldest", journal_playlist_btn_sort_date_func);
	journal_playlist_search = addTextInput("journal_playlist_search", grid, journal_playlist_refresh_rows, "search title/owner");
	journal_playlist_inp_dur_min = addTextInput("journal_playlist_inp_dur_min", grid, journal_playlist_update_dur, "min");
	journal_playlist_inp_dur_max = addTextInput("journal_playlist_inp_dur_max", grid, journal_playlist_update_dur, "max");
	journal_playlist_inp_dur_min.value = localStorage.getItem(journal_playlist_inp_dur_min.id) ?? "";
	journal_playlist_inp_dur_max.value = localStorage.getItem(journal_playlist_inp_dur_max.id) ?? "";
	moveElem(grid, -10);
	// page entry display
	page_div_entry = addTextDiv("journal_playlist_page_div_entry", journal_playlist_menu, "(no entry)");
	page_div_entry.style.fontFamily = "monospace";
	moveToQuickMenu(page_div_entry);
	moveElem(page_div_entry, -1000);
	journal_playlist_updatePageEntryDisplay();
	// page buttons
	journal_playlist_addPageButtons();
	// move to quick menu
	moveMenuToQuickMenu(journal_playlist_menu);
	// change detector - location change
	let loc_items = location;
	let loc_items_itv = setInterval(() => {
		if(loc_items !== location) {
			console.log("<> location changed", num_items, num);
			journal_playlist_refreshItems();
			journal_playlist_refresh_rows();
			loc_items = location;
		}
	}, 5000);
	// change detector - number of items
	let num_items = -1;
	let num_items_itv = setInterval(() => {
		const num = journal_playlist_getElem_items().length;
		if(num_items !== num) {
			console.log("<> number of items changed", num_items, num);
			journal_playlist_refreshItems();
			num_items = num;
		}
	}, 3000);
	// change detector - content of first item
	let val_items = null;
	let val_items_itv = setInterval(() => {
		const arr = journal_playlist_getElem_items();
		const val = arr.length > 0 ? journal_gatherEntryData_item(arr[0]).url : null;
		if(val_items !== val) {
			console.log("<> content of first item changed", val_items, val);
			journal_playlist_refreshItems();
			val_items = val;
		}
	}, 3000);
}



