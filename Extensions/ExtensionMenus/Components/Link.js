
class Link /*extends HTMLElement*/ {
	// constructor
	static create(props) {
		// create and configure element
		let { temp } = props;
		let customProps = { temp };
		const _this = createAndConfigureComponentManually(new Link(), "a", props, customProps);
		_this.classList.add("class_link");
		// custom behaviour
		//...
		// return
		return _this;
	}
};

function addLink(id, parent) {
	const elem = createElementReplace(parent, "a", {id, "class":"class_link"});
	return elem;
}



