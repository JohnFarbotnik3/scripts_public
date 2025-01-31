
// ========================================================
// menu
// ========================================================

var stm_elem_menu = addMenu("stm_elem_menu", corner_menu, "Style Macros");
appendStyleString(stm_elem_menu, "width: 400px;");

// ========================================================
// text input
// ========================================================

var stm_elem_input = addTextArea("stm_elem_input", stm_elem_menu, null, "add macros here\nline format:\nselector | style string \\n");
stm_elem_input.rows = 5;

// ========================================================
// apply-function and interval
// ========================================================

var stm_func_apply = () => {
	const value = stm_elem_input.value;
	const lines = value.split("\n").filter(s => s.includes("|"));
	lines.forEach(line => {
		const parts = line.split("|");
		const sel = parts[0].trim();
		const sty = parts[1].trim();
		const elems = document.querySelectorAll(sel);
		elems.forEach(elem => appendStyleString(elem, sty));
	});
};

var stm_apply_itv = null;
var stm_getAutoItv = ()    => JSON.parse(localStorage.getItem("stylemacros_autoItv")) ?? false;
var stm_setAutoItv = (val) => localStorage.setItem("stylemacros_autoItv", JSON.stringify(val));
var stm_itvEnd_func = () => { stm_setAutoItv(false); if(stm_apply_itv) clearInterval(stm_apply_itv); stm_apply_itv=null; };
var stm_itvBeg_func = () => { stm_itvEnd_func(); stm_setAutoItv(true); stm_apply_itv=setInterval(stm_func_apply, 3000); };

var stm_itvGrid = addGrid("stm_itvGrid", stm_elem_menu, [1,1,1]);
var stm_elem_apply = addButton("stm_elem_apply", stm_itvGrid, "Apply", stm_func_apply);
// TODO: Turn this pair into a button-set 
var stm_itvBeg = addButton("stm_itvBeg", stm_itvGrid, "Start interval", stm_itvBeg_func);
var stm_itvEnd = addButton("stm_itvEnd", stm_itvGrid, "Stop interval", stm_itvEnd_func);

moveElem(stm_elem_input, 1);

// ========================================================
// save & load
// ========================================================

var stm_func_save = () => {
	const str = stm_elem_input.value;
	return str;
};
var stm_func_load = (str) => {
	if(!str) return;
	stm_elem_input.value = str;
};
var stm_save_group = addSaveLoad("stm", stm_elem_menu, "Data_StyleMacros", stm_func_save, stm_func_load);

// auto-load and apply
function load_and_apply_styles() {
	try {
		stm_save_group.func_load();
		if(stm_getAutoItv()) stm_itvBeg_func();
		else stm_func_apply();
	} catch(err) {
		console.log(err);
	}
}
load_and_apply_styles();
setTimeout(() => { load_and_apply_styles(); }, 1000);



