
var SliderParams_Linear = class {
	constructor(min, max, def, step) {
		this.min = min;
		this.max = max;
		this.def = def;
		this.step = step;// desired step size (lin: +, exp: *)
		this.ratio = this.invLinear(def, min, max);
	}
	getLinear(ratio, min, max) { return ratio * (max - min) + min; }
	invLinear(value, min, max) { return (value - min) / (max - min); }
	getRatio() { return this.ratio; }
	getValue() { return this.getLinear(this.ratio, this.min, this.max); }
	getIStep() { return this.invLinear(this.step, 0, this.max - this.min); }
	setRatio(ratio) { this.ratio = Math.min(Math.max(ratio, 0), 1); }
	setValue(value) { this.setRatio(this.invLinear(value, this.min, this.max)); }
};

function addSlider(id, parent, text, precision, params, onUpdate) {
	// elems
	const elemP = createElementReplace(parent, "div", {id, "class":"class_slider"});
	const elemB = createElementReplace(elemP,  "div", {id:`${id}_A`, "class":"class_slider_bar"});
	const elemT = addTextDiv(id+"_T", elemP, text);
	const elemV = addTextDiv(id+"_V", elemP, "<value>");
	elemT.style = "width: 60%; min-width: fit-content; justify-content: end;";
	elemV.style = "width: 40%; min-width: fit-content; right: 0%; margin-left: 2px;";
	// scroll update function
	const update = () => {
		const ratio = params.getRatio();
		const value = params.getValue();
		elemB.style.width = `${ratio * 100}%`;
		elemV.innerHTML = value.toFixed(precision);
		onUpdate(value);
	};
	const onScroll = (event) => {
		const dir = (event.deltaY < 0) ? +1 : -1;
		event.preventDefault();// absorb event
		params.setRatio(params.getRatio() + dir * params.getIStep());
		update();
	};
	// register scroll event listener
	elemP.onmouseenter = () => window.addEventListener("wheel", onScroll, { passive: false });
	elemP.onmouseleave = () => window.removeEventListener("wheel", onScroll);
	// initial update
	update();
	// set functions for outside use
	elemP.params = params;
	elemP.update = update;
	// return element
	return elemP;
}

