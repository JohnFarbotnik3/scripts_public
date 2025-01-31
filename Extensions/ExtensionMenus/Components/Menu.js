
class Menu /*extends HTMLElement*/ {
	// constructor
	static create(props) {
		// create and configure element
		let					{ children, startOpen, text, button, area } = props;
		let customProps =	{ children, startOpen, text, button, area };
		const _this = createAndConfigureComponentManually(new Menu(), "div", props, customProps);
		// customize
		_this.classList.add("_Menu");
		const onclick = () => _this.toggle(_this);
		_this.button = Button.create({ parent: _this, classList: ["_Menu_button"], innerText: (text ?? ""), ...button, onclick });
		_this.area   = Div   .create({ parent: _this, classList: ["_Menu_area"], ...area });
		_this.appendChild = _this.f_appendChild;
		if(children) for(const child of children) _this.appendChild(child);
		if(startOpen) _this.open(); else _this.close();
		// return
		return _this;
	}
	// children
	button	= null;
	area	= null;
	// custom element behaviour
	f_appendChild(elem) { this.area.appendChild(elem); }
	_toggle(_this) { _this.toggle(); }
	toggle() { if(this.isOpen()) this.close(); else this.open(); }
	isOpen() { return this.area.style.display !== "none"; }
	open  () { this.area.style.display = ""; }
	close () { this.area.style.display = "none"; }
};

// TODO: fix the way this is structured, as this component is very awkward to operate on
function addMenu(id, parent, text, startOpen = false) {
	const elemP = createElementReplace(parent, "div", {id, "class":"_Menu"});
	const elemA = createElementReplace(elemP , "div", {id:id+"_A", "class":"_Menu_area"});
	// functions for external use
	elemA.open   = () => elemA.style.display = "";
	elemA.close  = () => elemA.style.display = "none";
	elemA.isOpen = () => elemA.style.display !== "none";
	// toggle button - TODO: use boolean instead
	const onclick = (event) => { if(elemA.isOpen()) elemA.close(); else elemA.open(); };
	const elemB = Button.create({id: `${id}_B`, parentElement: elemP, innerText: text, onclick, classList: ["_Menu_button"]});
	// move button to spot before area element
	moveElem(elemB, -1);
	// hide menu
	elemA.style.display = startOpen ? "" : "none";
	// add references to elements for easy outside access
	elemA.button = elemB;
	// return Area element, since this is what other elements will append to
	return elemA;
}

