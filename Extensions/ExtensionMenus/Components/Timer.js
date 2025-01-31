
function addTimer(id, parent, timer_func, buttonText, interval) {
	const elem_grid = addGrid(`${id}_grid`, parent, [1,1,1,2]);
	const elem_inpt = addTextInput(`${id}_inpt`, elem_grid, null, "timer (seconds)");
	const elem_curr = addTextDiv(`${id}_curr`, elem_grid, "--");
	const elem_orig = addTextDiv(`${id}_orig`, elem_grid, "--");
	const func_start = () => addTimer_func_start(elem_grid, elem_inpt, elem_curr, elem_orig, timer_func, interval);
	const func_clear = () => addTimer_func_clear(elem_grid, elem_curr);
	elem_grid.start = func_start;
	elem_grid.clear = func_clear;
	const elem_btnc = addButton_Cycle(`${id}_btnc`, elem_grid, [buttonText, "Cancel"], [func_start, func_clear], ["filter:;", "filter: brightness(150%);"]);
	//const elem_btn1 = addButton(`${id}_btn1`, elem_grid, buttonText, func_start);
	//const elem_btn0 = addButton(`${id}_btn0`, elem_grid, "X", func_clear);
	const func_scroll = (event) => addTimer_func_onscroll(event, elem_inpt);
	elem_inpt.onmouseenter = () => window.   addEventListener("wheel", func_scroll, { passive: false });
	elem_inpt.onmouseleave = () => window.removeEventListener("wheel", func_scroll);
	return elem_grid;
}

function addTimer_func_clear(elem, elem_curr) {
	if(elem.itv) {
		clearInterval(elem.itv);
		elem.itv = null;
		elem_curr.innerText = "--";
	}
}

function addTimer_func_start(elem, elem_inpt, elem_curr, elem_orig, timer_func, interval) {
	// get activation time (in seconds)
	if(!elem_inpt.value) elem_inpt.value = 1.0;
	const time = Number(elem_inpt.value);
	const date_beg = new Date();
	const date_end = new Date(date_beg).setSeconds(date_beg.getSeconds() + time);
	//const dt = Math.min(Math.max((time < 10) ? (time * 0.05) : (time * 0.025), 0.1), 10);
	const dt = (time < 10) ? 0.1 : 1;
	// update time display
	addTimer_func_clear(elem, elem_curr);
	elem.currentTime = time;
	elem_orig.innerText = Number(time).toFixed(0);
	elem_curr.innerText = Number(time).toFixed(0);
	elem.itv = setInterval(() => {
		const date_cur = new Date();
		//elem.currentTime -= dt;
		const diff = (date_end - date_cur)/1000
		elem.currentTime = diff;
		elem_curr.innerText = diff.toFixed(diff < 10 ? 1 : 0);
		if(elem.currentTime <= 0) {
			timer_func();
			if(interval) elem.currentTime = time;
			else {
				elem.currentTime = 0;
				addTimer_func_clear(elem, elem_curr);
			}
		}
	}, dt * 1000);
}

function addTimer_func_onscroll(event, elem_inpt) {
	event.preventDefault();// absorb event
	const sign = (event.deltaY < 0) ? +1 : -1;
	const value = Number(elem_inpt.value ? elem_inpt.value : 0);
	const incr = (value >= 600) ? 300 : 60;
	elem_inpt.value = Math.max(0, value + incr * sign);
}



