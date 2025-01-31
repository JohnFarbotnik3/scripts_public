
const video_sliders_menu = addMenu("video_sliders_menu", corner_menu, "Video Tools - Sliders");
appendStyleString(video_sliders_menu, "width: 200px;");

// ========================================================
// Sliders
// ========================================================

// target element selector
const video_sliders_elem_sel_grid = addGrid("video_sliders_elem_sel_grid", video_sliders_menu, [1]);
const video_sliders_elem_selector = addTextInput_Selector("video_sliders_elem_selector", video_sliders_elem_sel_grid, "selector - slider target");
appendStyleString(video_sliders_elem_selector, "outline: 2px solid #C77;");

// values
const video_sliders_values = {speed: 1, lumen: 1, contr: 1};
function video_sliders_apply_values() {
	const elem = qsel(video_sliders_elem_selector.value);
	if(elem) {
		const {speed, lumen, contr} = video_sliders_values;
		elem.playbackRate = speed;
		let str = "";
		if(contr != 1.0) str += `contrast(${contr}) `;
		if(lumen != 1.0) str += `brightness(${lumen}) `;
		elem.style.filter = str;
	}
}

// sliders
const video_sliders_elem_sliderGrid = addGrid("video_sliders_elem_sliderGrid", video_sliders_menu, [1]);
function video_sliders_func_slider_speed(value) { video_sliders_values.speed = value; video_sliders_apply_values(); }
function video_sliders_func_slider_lumen(value) { video_sliders_values.lumen = value; video_sliders_apply_values(); }
function video_sliders_func_slider_contr(value) { video_sliders_values.contr = value; video_sliders_apply_values(); }
const video_sliders_params_speed = new SliderParams_Linear(0.5, 3.0, 1.0, 0.05);
const video_sliders_params_lumen = new SliderParams_Linear(0.1, 3.0, 1.0, 0.05);
const video_sliders_params_contr = new SliderParams_Linear(0.1, 3.0, 1.0, 0.05);
const video_sliders_elem_slider_speed = addSlider("video_sliders_elem_slider_speed", video_sliders_elem_sliderGrid, "Speed:", 2, video_sliders_params_speed, video_sliders_func_slider_speed);
const video_sliders_elem_slider_lumen = addSlider("video_sliders_elem_slider_lumen", video_sliders_elem_sliderGrid, "Brightness:", 2, video_sliders_params_lumen, video_sliders_func_slider_lumen);
const video_sliders_elem_slider_contr = addSlider("video_sliders_elem_slider_contr", video_sliders_elem_sliderGrid, "Contrast:", 2, video_sliders_params_contr, video_sliders_func_slider_contr);

// ========================================================
// Buffer Health
// ========================================================

const video_sliders_buffer_grid = addGrid("video_sliders_buffer_grid", video_sliders_menu, [1,1]);
const video_sliders_buffer_health = addTextDiv("video_sliders_buffer_health", video_sliders_buffer_grid, "buffer: --");
const video_sliders_buffer_speed = addTextDiv("video_sliders_buffer_speed", video_sliders_buffer_grid, "speed: --");
const video_sliders_buffer_itv = setInterval(() => {
	const elem = qsel(video_sliders_elem_selector.value);
	if(elem && elem?.buffered.length > 0)
			video_sliders_buffer_health.innerText = `buffer: ${(elem.buffered.end(0) - elem.currentTime).toFixed(1)}s`;
	else	video_sliders_buffer_health.innerText = `buffer: ??`;
	if(elem && elem?.playbackRate)
			video_sliders_buffer_speed.innerText = `speed: ${(elem.playbackRate).toFixed(2)}x`;
	else	video_sliders_buffer_speed.innerText = `speed: ??`;
}, 200);

// ========================================================
// Save & Load
// ========================================================

var video_sliders_func_save_sliders = () => {
	const obj = {
		selector: video_sliders_elem_selector.value,
		speed: video_sliders_params_speed.getRatio(),
		lumen: video_sliders_params_lumen.getRatio(),
		contr: video_sliders_params_contr.getRatio(),
	};
	const str = JSON.stringify(obj);
	return str;
};
var video_sliders_func_load_sliders = (str) => {
	if(!str) return;
	const obj = JSON.parse(str);
	if(obj.selector) video_sliders_elem_selector.value = obj.selector;
	if(obj.speed) video_sliders_params_speed.setRatio(obj.speed);
	if(obj.lumen) video_sliders_params_lumen.setRatio(obj.lumen);
	if(obj.contr) video_sliders_params_contr.setRatio(obj.contr);
	// try to apply slider values upon loading
	const sel = obj.selector;
	if(sel) qsel_until_result(sel, 1000, 10).then(elem => {
		video_sliders_elem_selector.update();
		video_sliders_elem_slider_speed.update();
		video_sliders_elem_slider_lumen.update();
		video_sliders_elem_slider_contr.update();
	});
};
var video_sliders_elem_group_saveload = addSaveLoad("vid_sliders", video_sliders_menu, "Data_VideoTools_Sliders", video_sliders_func_save_sliders, video_sliders_func_load_sliders);

// auto-load and apply
video_sliders_elem_group_saveload.func_load();

// ========================================================
// Site Specific Configuration
// ========================================================

["youtube.com", "kick.com", "twitch.tv", "gogoanime"]
.forEach(str => { if(location.hostname.includes(str)) {
	const grid = moveMenuContentsToQuickMenu(video_sliders_menu);
	grid.style.width = "200px";
}});



