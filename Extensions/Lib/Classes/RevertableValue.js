
class RevertableValue {
	constructor(key, initialValue) {
		this.key = key;
		this.hasOriginal = false;
		this.valOrig = null;
		this.valCurr = null;
		this.locOrig = null;
		this.locCurr = null;
		this.load();
		if(!this.hasOriginal) this.value = initialValue;
	}
	load() {
		const vc = `${this.key}_valCurr`;
		const vo = `${this.key}_valOrig`;
		const lc = `${this.key}_locCurr`;
		const lo = `${this.key}_locOrig`;
		const item_vc = sessionStorage.getItem(vc);
		const item_vo = sessionStorage.getItem(vo);
		const item_lc = sessionStorage.getItem(lc);
		const item_lo = sessionStorage.getItem(lo);
		// only load value if location is the same
		if(item_lc === item_lo) {
			if(item_vc !== null) { this.valCurr = JSON.parse(item_vc); }
			if(item_vo !== null) { this.valOrig = JSON.parse(item_vo); this.hasOriginal = true; }
			if(item_lc !== null) { this.locCurr = JSON.parse(item_lc); }
			if(item_lo !== null) { this.locCurr = JSON.parse(item_lo); }
		}
	}
	revert				() { return this.value = this.valOriginal; }
	get value			() { return this.valCurr; }
	get valueOriginal	() { return this.valOrig; }
	set value			(val) {
		const loc = location.toString();
		sessionStorage.setItem(`${this.key}_valCurr`, JSON.stringify(this.valCurr = val));
		sessionStorage.setItem(`${this.key}_locCurr`, JSON.stringify(this.locCurr = loc));
		if(!this.hasOriginal) {
			this.valueOriginal = val;
		}
	}
	set valueOriginal	(val) {
		const loc = location.toString();
		sessionStorage.setItem(`${this.key}_valOrig`, JSON.stringify(this.valOrig = val));
		sessionStorage.setItem(`${this.key}_locCurr`, JSON.stringify(this.locCurr = loc));
		this.hasOriginal = true;
	}
};

