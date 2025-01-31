
// ========================================================
// Content
// ========================================================

const link_accumulator_menu = Menu.create({ parent: corner_menu, id: "link_accumulator_menu", text: "Link Accumulator" });
appendStyleString(link_accumulator_menu, "width: 200px;");

const link_accumulator_textarea = addTextArea("link_accumulator_textarea", link_accumulator_menu, null, "link accumulator", false);
appendStyleString(link_accumulator_textarea, "width: inherit; height: 150px;");

function link_accumulator_set_textarea_functions() {
	const textarea = link_accumulator_textarea;
	textarea.appendStr  = (str) => { textarea.value += str; };
	textarea.appendLine = (str) => { textarea.value += str + "\n"; };
	textarea.getLines = () => textarea.value.split("\n");
	textarea.setLines = (arr) => { textarea.value = arr.join("\n"); }
	textarea.getFirstLine = () => textarea.getLines()[0];
	textarea.popFirstLine = () => {
		const arr = textarea.getLines();
		const str = arr.shift(0);
		textarea.setLines(arr);
		return str;
	};

	const cb = navigator.clipboard;
	textarea.clipboardCopy = async () => await cb.writeText(textarea.value);
	textarea.clipboardCut = async () => { await cb.writeText(textarea.value); console.log("<> cut", textarea.value); textarea.value = ""; }
	textarea.clipboardShift = async () => { const str = textarea.popFirstLine(); console.log("<> shift", str); await cb.writeText(str);}
	textarea.clipboardAppend = async () => textarea.appendLine(await cb.readText());
}
link_accumulator_set_textarea_functions();

const link_accumulator_btn_copy = addButton("link_accumulator_btn_copy", link_accumulator_menu, "Copy"  , link_accumulator_textarea.clipboardCopy, null);
const link_accumulator_btn_grid = addGrid("link_accumulator_btn_grid", link_accumulator_menu, [1,1,1]);
const link_accumulator_btn_cut  = addButton("link_accumulator_btn_cut" , link_accumulator_btn_grid, "Cut"   , link_accumulator_textarea.clipboardCut, null);
const link_accumulator_btn_shft = addButton("link_accumulator_btn_shft", link_accumulator_btn_grid, "Pop"   , link_accumulator_textarea.clipboardShift, null);
const link_accumulator_btn_apnd = addButton("link_accumulator_btn_apnd", link_accumulator_btn_grid, "Append", link_accumulator_textarea.clipboardAppend, null);
moveElem(link_accumulator_textarea, 100);

