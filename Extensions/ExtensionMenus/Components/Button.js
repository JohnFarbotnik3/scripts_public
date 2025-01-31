
class Button /*extends HTMLElement*/ {
	// constructor
	static create(props) {
		// create and configure element
		let { text } = props;
		let customProps = { text };
		const _this = createAndConfigureComponentManually(new Button(), "button", props, customProps);
		// customize
		_this.classList.add("_Button");
		if(customProps.text) _this.innerText = text;
		// return
		return _this;
	}
};

// TODO: figure out why webcomponents dont work in content scripts!
// see: https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements
//window.customElements.define(Button.TAG_NAME, Button);

// TODO: replace instances of these with Button class

function addButton(id, parent, text, onClickL, onClickR=null) {
	const elem = createElementReplace(parent, "button", {id, "class":"_Button"});
	elem.innerText = text;
	if(onClickL) elem.onclick = onClickL;
	if(onClickR) elem.oncontextmenu = (e) => { onClickR(e); e.preventDefault(); };
	return elem;
}

