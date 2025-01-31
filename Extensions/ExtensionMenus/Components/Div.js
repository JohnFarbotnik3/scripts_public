
class Div /*extends HTMLElement*/ {
	// constructor
	static create(props) {
		// create and configure element
		let { text } = props;
		let customProps = { text };
		const _this = createAndConfigureComponentManually(new Div(), "div", props, customProps);
		// customize
		_this.classList.add("_Div");
		if(customProps.text) _this.innerText = text;
		// return
		return _this;
	}
};

