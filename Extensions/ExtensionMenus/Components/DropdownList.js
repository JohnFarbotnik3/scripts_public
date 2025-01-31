
class DropdownList {
	constructor(props) {
		// create element.
		let { id, options } = props;
		if(id) document.getElementById(id)?.remove();
		const elem = document.createElement("select");
		if(id) elem.id = id;
		// add options.
		if(options) {
			for(const value of options) {
				const opt = document.createElement("option");
				opt.value = value;
				opt.innerText = value;
				elem.appendChild(opt);
			}
		}
		// add remaining props.
		delete props.id;
		delete props.options;
		for(const [key,val] of Object.entries(props)) elem[key] = val;
		return elem;
	}
};

