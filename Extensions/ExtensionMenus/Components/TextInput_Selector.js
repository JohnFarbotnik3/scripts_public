
function addTextInput_Selector(id, parent, placeholder="") {
	const elem = createElementReplace(parent, "input", {id, "class":"class_textinput"});
	elem.setValue = (value) => addTextInput_Selector_set(elem, value);
	elem.update = () => addTextInput_Selector_update(elem);
	elem.onblur = () => addTextInput_Selector_update(elem);
	elem.onmouseenter = () => { elem.hovered = true; addTextInput_Selector_highlightTarget(elem); }
	elem.onmouseleave = () => { elem.hovered = false; addTextInput_Selector_highlightRestore(elem); };
	elem.oninput = () => addTextInput_Selector_update(elem);
	elem.placeholder = placeholder;
	return elem;
}

function addTextInput_Selector_highlightTarget(inputElem) {
	// restore style of previous target
	addTextInput_Selector_highlightRestore(inputElem);
	// highlight new target
	const target = qsel(inputElem.value);
	if(target) {
		inputElem.highlightData = [target, target.style.outline, target.style.outlineOffset];
		target.style.outline = "10px dotted #7FF";
		target.style.outlineOffset = "-5px";
	}
}

function addTextInput_Selector_highlightRestore(inputElem) {
	if(inputElem.highlightData) {
		const [target, outline, outlineOffset] = inputElem.highlightData;
		target.style.outline = outline;
		target.style.outlineOffset = outlineOffset;
		inputElem.highlightData = null;
	}
}

function addTextInput_Selector_update(inputElem) {
	inputElem.style.outline = qsel(inputElem.value) ? "2px solid #7AA" : "2px solid #C77";
	if(inputElem.hovered /*|| (inputElem === document.activeElement)*/) addTextInput_Selector_highlightTarget(inputElem);
}

function addTextInput_Selector_set(inputElem, value) {
	inputElem.value = value;
	addTextInput_Selector_update(inputElem);
}



