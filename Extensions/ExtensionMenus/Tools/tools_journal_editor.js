
console.log("<> siteutils_journal_editor");

// ========================================================
// Content
// ========================================================

const journal_editor_menu = addMenu("journal_editor_menu", corner_menu, "Journal Editor", false);

// ========================================================
// Import and Export
// ========================================================

const journal_editor_import_menu = addMenu("journal_editor_import_menu", journal_editor_menu, "Import / Export", true);
const journal_editor_import_btn_grid = addGrid("journal_editor_import_btn_grid", journal_editor_import_menu, [1,1]);
const journal_editor_export_entries_btn = addButton("journal_editor_export_entries_btn", journal_editor_import_btn_grid, "Export entries", journal_editor_export_entries_func);
const journal_editor_export_objects_btn = addButton("journal_editor_export_objects_btn", journal_editor_import_btn_grid, "Export objects", journal_editor_export_objects_func);
const journal_editor_import_entries_btn = addButton("journal_editor_import_entries_btn", journal_editor_import_btn_grid, "Import entries", journal_editor_import_entries_func);
const journal_editor_import_objects_btn = addButton("journal_editor_import_objects_btn", journal_editor_import_btn_grid, "Import objects", journal_editor_import_objects_func);
const journal_editor_save_entries_btn = addButton("journal_editor_save_entries_btn", journal_editor_import_btn_grid, "Save entries", journal_editor_save_entries_func);
const journal_editor_save_objects_btn = addButton("journal_editor_save_objects_btn", journal_editor_import_btn_grid, "Save objects", journal_editor_save_objects_func);
const journal_editor_load_entries_btn = addButton("journal_editor_load_entries_btn", journal_editor_import_btn_grid, "Load entries", journal_editor_load_entries_func);
const journal_editor_load_objects_btn = addButton("journal_editor_load_objects_btn", journal_editor_import_btn_grid, "Load objects", journal_editor_load_objects_func);
const journal_editor_import_textarea = addTextArea("journal_editor_import_textarea", journal_editor_import_menu, null, "(entry text)", false);
appendStyleString(journal_editor_import_textarea, "height: 150px;");

async function journal_editor_export_entries_func() { journal_editor_import_textarea.value = await journal_export_entries(); }
async function journal_editor_export_objects_func() { journal_editor_import_textarea.value = await journal_export_objects(); }

async function journal_editor_import_entries_func() { await journal_import_entries(journal_editor_import_textarea.value); }
async function journal_editor_import_objects_func() { await journal_import_objects(journal_editor_import_textarea.value); }

async function journal_editor_save_entries_func() {
	console.debug("<> journal_editor_save_entries_func()");
	const fd = "";
	const fn = `journal_entry_pairs_${new Date().toJSON().replaceAll(":","-")}.txt`;
	const str = await journal_export_entries();
	await downloadData(fd, fn, str);
}
async function journal_editor_save_objects_func() {
	console.debug("<> journal_editor_save_objects_func()");
	const fd = "";
	const fn = `journal_object_pairs_${new Date().toJSON().replaceAll(":","-")}.txt`;
	const str = await journal_export_objects();
	await downloadData(fd, fn, str);
}

async function journal_editor_load_entries_func() { console.error("<> journal_editor_load_entries_func()"); }
async function journal_editor_load_objects_func() { console.error("<> journal_editor_load_objects_func()"); }

// ========================================================
// Search
// ========================================================

const journal_editor_search_menu = null;//TODO
// * use blankEntryFunc to determine list of column attributes
// - have 1 attribute substring filter(s)
// - have 2 sorting attribute(s)

// ========================================================
// Edit
// ========================================================

const journal_editor_edit_menu = null;//TODO
/*TODO:
* create a table component for editing
	- make scrollable in both x and y directions
	- provide [...col_attributes] when making table
	- make fields editable if editMode=true
	- have both a grid of TextDivs and a grid of TextInputs
	^ which grid to display depends on editMode 

- add button for commiting changes from table
*/

// ========================================================
// EOF
// ========================================================

