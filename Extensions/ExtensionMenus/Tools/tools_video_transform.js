
const video_transform_menu = addMenu("video_transform_menu", corner_menu, "Video Tools - Pan & Zoom");
appendStyleString(video_transform_menu, "width: 200px;");

// ========================================================
// Pan & Zoom
// ========================================================

// target element selector
const video_transform_elem_sel_grid = addGrid("video_transform_elem_sel_grid", video_transform_menu, [1]);
const video_transform_elem_selector = addTextInput_Selector("video_transform_elem_selector", video_transform_elem_sel_grid, "selector - slider target");
appendStyleString(video_transform_elem_selector, "outline: 2px solid #C77;");

// set video transformation
let transformMode = false;
let transformBox = null;// box follows cursor
let transformElem = null;
let transformRect = null;
let transformZoom = 1.0;
let transformPanX = 0.0;
let transformPanY = 0.0;
let transformBoxSz = 4;
let prevEventX = 0.0;
let prevEventY = 0.0;
function onClickTransform() {
	transformMode = !transformMode;
	console.debug(transformMode);
	// create transform box
	if(!transformBox) {
		transformBox = createElementReplace(document.body, "div", {id:"_transformBox2"});
		transformBox.style = `position: fixed; width: ${transformBoxSz}px; height: ${transformBoxSz}px; background: #FFA; z-index: 30000;`;
		transformBox.style.display = "none";
	}
	// add or remove zoom handler
	if(transformMode) {
		transformElem = qsel(video_transform_elem_selector.value);
		transformParent = transformElem.parentNode.parentNode;
		transformRect = transformParent.getBoundingClientRect();
		window.addEventListener("wheel", transformHandlerZoom, {passive: false});
		transformParent.addEventListener("mousemove", transformHandlerPan, false);
		transformBox.style.display = "";
		transformBox.onclick = onClickTransform;
		transformUpdateStyle();
	}
	else {
		window.removeEventListener("wheel", transformHandlerZoom);
		transformParent.removeEventListener("mousemove", transformHandlerPan, false);
		transformBox.style.display = "none";
	}
}
function onClickUnTransform(){
	transformZoom = 1.0;
	transformPanX = 0.0;
	transformPanY = 0.0;
	transformElem.style.transform = "";
}
function transformHandlerZoom(event) {
	const clampValue = (value, min, max) => Math.min(Math.max(value, min), max);
	const absorbScroll = (e) => { e.preventDefault(); return (e.deltaY < 0) ? +1 : -1; };
	transformZoom = clampValue(transformZoom * (1.0 + 0.06 * absorbScroll(event)), 0.5, 3.0);
	transformHandlerPan({
		clientX: prevEventX,
		clientY: prevEventY
	});
}
function transformHandlerPan(event) {
	const ex = prevEventX = event.clientX;
	const ey = prevEventY = event.clientY;
	const rect = transformRect;
	const w = rect.width;
	const h = rect.height;
	const mult = (1.0 - 1.0 / transformZoom);
	transformPanX = mult * 0.80 * (w - (ex * 2));
	transformPanY = mult * 0.65 * (h - (ey * 2));
	// move box to cursor
	transformBox.style.left = `${ex - transformBoxSz/2}px`;
	transformBox.style.top  = `${ey - transformBoxSz/2}px`;
	// update video style
	transformUpdateStyle();
}
function transformUpdateStyle() {
	const s = transformZoom;
	const x = transformPanX;
	const y = transformPanY;
	// set video transform
	const st = `scale(${s,s}) translate(${x}px,${y}px)`;
	transformElem.style.transform = st;
}

// buttons
const video_transform_buttonGrid = addGrid("video_transform_buttonGrid", video_transform_menu, [1,1]);
//appendStyleString(video_transform_buttonGrid,"min-width: 200px;");
const video_transform_button_toggle = addButton("video_transform_button_toggle", video_transform_buttonGrid, "Pan & Zoom", onClickTransform);
const video_transform_button_reset = addButton("video_transform_button_reset", video_transform_buttonGrid, "Reset P/Z", onClickUnTransform);

// ========================================================
// save & load
// ========================================================

function video_transform_func_save_transform() {
	const obj = { selector: video_transform_elem_selector.value };
	const str = JSON.stringify(obj);
	return str;
};
function video_transform_func_load_transform(str) {
	if(!str) return;
	const obj = JSON.parse(str);
	if(obj.selector) video_transform_elem_selector.value = obj.selector;
	const sel = obj.selector;
	if(sel) qsel_until_result(sel, 1000, 10).then(elem => video_transform_elem_selector.update());
};
const video_transform_elem_group_saveload = addSaveLoad("vid_transform", video_transform_menu, "Data_VideoTools_Transform", video_transform_func_save_transform, video_transform_func_load_transform);

// auto-load and apply
setTimeout(() => { try { video_transform_elem_group_saveload.func_load(); } catch(err) { console.log(err); }}, 1000);



