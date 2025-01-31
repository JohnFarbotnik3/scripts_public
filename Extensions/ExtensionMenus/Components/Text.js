
function addTextDiv(id, parent, text) {
	const elem = createElementReplace(parent, "div", {id, "class":"class_textdiv"});
	elem.innerText = text;
	return elem;
}

function addTextSpan(id, parent, text) {
	const elem = createElementReplace(parent, "span", {id, "class":"class_textspan"});
	elem.innerText = text;
	return elem;
}

function addTextInput(id, parent, oninput=null, placeholder="") {
	const elem = createElementReplace(parent, "input", {id, "class":"class_textinput"});
	elem.oninput = oninput;
	elem.placeholder = placeholder;
	return elem;
}

function addTextArea(id, parent, oninput=null, placeholder="", wrap=true) {
	const style = (wrap ? "" : " overflow-x: scroll; white-space: pre;");
	const elem = createElementReplace(parent, "textarea", {id, style, "class":"class_textarea"});
	elem.oninput = oninput;
	elem.placeholder = placeholder;
	return elem;
}

