
// ========================================================
// quick menu
// ========================================================

var corner_menu_stayOpen = false;
var corner_menu_animTimeout = null;
const corner_menu = Menu.create({ parent: document.body, id: "corner_menu" });
appendStyleString(corner_menu, "z-index: 11000; margin: 0px; position: fixed; top: 0px; left: calc((100% - 100px) * 0.0); color: #FFF;");
appendStyleString(corner_menu.area, "position: relative; right: 0px; min-width: 100px; max-height: calc(100vh - 50px); overflow-y: scroll; width: fit-content;");
appendStyleString(corner_menu.button, "background: #0001; width: 20px; height: 45px;");
corner_menu.onmouseenter = () => {
	appendStyleString(corner_menu.area, "opacity: 1.0; transition: 0s; display:;");
	clearTimeout(corner_menu_animTimeout);
}
corner_menu.onmouseleave = () => {
	if(corner_menu_stayOpen) return;
	appendStyleString(corner_menu.area, "opacity: 0.0; transition: ease 1.0s;");
	corner_menu_animTimeout = setTimeout(() => {corner_menu.area.style.display = "none";}, 1.0 * 1000);
}
corner_menu.button.oncontextmenu = (e) => {
	e.preventDefault();
	corner_menu_stayOpen ^= true;
	corner_menu.button.innerHTML = corner_menu_stayOpen ? "*" : "";
};

const quick_menu = Menu.create({ parent: corner_menu, id: "quick_menu", text: "Quick Menu", startOpen: true });
// extra grid to prevent moveElem from putting elements before quick_menu
let quick_grid = addGrid("quick_grid", corner_menu, [1]);
let quick_grid_index = 2;

function moveToQuickMenu(elem) {
	setParent(elem, quick_menu);
}
function moveMenuToQuickMenu(elem) {
	setParent(elem, quick_grid);
	elem.open();
}
function moveMenuContentsToQuickMenu(menu) {
	const grid = addGrid(`${menu.id}_grid`, quick_menu, [1]);
	const elems = [...(menu?.area?.childNodes ?? menu.childNodes)];
	for(elem of elems) grid.appendChild(elem);
	appendStyleString(grid, "margin-bottom: 10px;");
	//menu.parentElement.remove();
	menu.remove();
	return grid;
}

// ========================================================
// save and load
// ========================================================

var addSaveLoad = (id_prefix, parent, storageKey, onSave, onLoad) => {
	var func_save = () => localStorage.setItem(storageKey, onSave());
	var func_load = () => onLoad(localStorage.getItem(storageKey) ?? "");
	var elem_grid = addGrid  (`${id_prefix}_elem_grid`, parent, [1,1]);
	var elem_save = addButton(`${id_prefix}_elem_save`, elem_grid, "Save", func_save);
	var elem_load = addButton(`${id_prefix}_elem_load`, elem_grid, "Load", func_load);
	return { func_save, func_load, elem_grid, elem_save, elem_load };
};



