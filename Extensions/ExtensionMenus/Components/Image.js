
// TODO: wrap img element inside a div element for convenience

class ComponentImage /*extends HTMLElement*/ {
	// constructor
	static create(props) {
		// create and configure element
		let { temp } = props;
		let customProps = { temp };
		const _this = createAndConfigureComponentManually(new ComponentImage(), "img", props, customProps);
		_this.classList.add("class_image");
		// custom behaviour
		_this.src = props?.src;
		_this.alt = "image";
		// return
		return _this;
	}
};

function addImage(id, parent, src) {
	const elem = createElementReplace(parent, "img", {id, "class":"class_image"});
	if(src) elem.src = src;
	elem.alt = "image";
	return elem;
}



