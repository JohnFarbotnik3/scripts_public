
class Grid /*extends HTMLElement*/ {
	// constructor
	static create(props) {
		// create and configure element
		let { columns } = props;
		let customProps = { columns };
		const _this = createAndConfigureComponentManually(new Grid(), "div", props, customProps);
		// custom behaviour
		_this.classList.add("_Grid");
		let sum = 0;
		columns.forEach(w => sum+=w);
		_this.style.gridTemplateColumns = `repeat(1, ${columns.map(w => `minmax(auto,${w*100/sum}%)`).join(" ")})`;
		// return
		return _this;
	}
};

function addGrid(id, parent, cols = [1,2,3]) {
	const elem = createElementReplace(parent, "div", {id, "class":"_Grid"});
	let sum = 0;
	cols.forEach(w => sum+=w);
	elem.style.gridTemplateColumns = `repeat(1, ${cols.map(w => `minmax(auto,${w*100/sum}%)`).join(" ")})`;
	return elem;
}

