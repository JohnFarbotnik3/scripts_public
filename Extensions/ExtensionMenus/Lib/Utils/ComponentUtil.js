
// ========================================================
// element selection
// ========================================================

const qsel = (selector) => { try { return document.querySelector(selector); } catch(e) { return null; }};
const qall = (selector) => { try { return document.querySelectorAll(selector); } catch(e) { return null; }};
const qtxt = (selector) => { try { return document.querySelector(selector).innerText; } catch(e) { return null; }};

// find all elements including text
const qall_includes = (selector,str) => [...qall(selector)].filter(e => e.innerText.toLowerCase().includes(str.toLowerCase()));

//TODO - create iframe penetrating qselector
const qpenetrate = (selector) => null;

// try query selector until element is found
const qsel_until_result = (selector, interval=1000, attempts=10) => try_until_result(qsel, selector, interval, attempts);

// ========================================================
// element creation
// ========================================================

const stringToDocument = (html) => (new DOMParser()).parseFromString(html,["text/html"]);
const stringToElement  = (html) => stringToDocument(html).body.children[0];
const stringToElements = (html) => stringToDocument(html).body.children;

// WARNING: doesn't have special processing for className/classList attribute
const generateElementString = (tag, obj) => `<${tag} ${Object.keys(obj).map(key => `${key}="${obj[key]}"`).join(" ")}></${tag}>`;
const generateElement = (tag, obj) => stringToElement(generateElementString(tag, obj));

function createElementFind(parent, tag, obj) {
	const newElem = generateElement(tag, obj);
	const oldElem = document.getElementById(newElem.id);
	if(oldElem) return oldElem;
	parent.appendChild(newElem);
	return newElem;
}
function createElementReplace(parent, tag, obj) {
	const newElem = generateElement(tag, obj);
	const oldElem = document.getElementById(newElem.id);
	if(oldElem) oldElem.remove();
	parent.appendChild(newElem);
	return newElem;
}

function createAndConfigureComponentManually(classInstance, tagName, props, customProps) {
	const _elem = document.createElement(tagName);
	// extract properties that have special handling
	customProps.tagName			= tagName;
	customProps.classList		= props.classList;
	customProps.parentElement	= props.parentElement ?? props.parent;
	customProps.parent			= props.parent ?? props.parentElement;
	customProps.children		= props.customProps;
	for(const key of Object.keys(customProps)) delete props[key];
	// NOTE: in Firefox, WebComponents dont work in content scripts,
	// so I have opted to add the properties and methods manually.
	Object.assign(_elem, classInstance);
	const classMethods = Object.getOwnPropertyNames(classInstance.__proto__);
	for(const key of classMethods) _elem[key] = classInstance[key];
	// copy all remaining properties to element (assume they are valid for superclass)
	for(const key of Object.keys(props)) _elem[key] = props[key];
	// replace special substrings in id
	if(!_elem.id) _elem.id = "$PARENT_$TAGNAME";
	if(_elem.id.includes("$TAGNAME"))
		_elem.id = _elem.id.replaceAll("$TAGNAME", tagName);
	if(_elem.id.includes("$PARENT") && customProps.parentElement)
		_elem.id = _elem.id.replaceAll("$PARENT", customProps.parentElement.id);
	// remove elements with same id (assumed to be duplicates)
	if(_elem.id) document.querySelectorAll(`#${_elem.id}`).forEach(el => el.remove());
	// add classes from array classList
	if(customProps.classList) for(const item of customProps.classList) _elem.classList.add(item);
	// append to parent
	if(customProps.parentElement) customProps.parentElement.appendChild(_elem);
	// append children
	if(customProps.children) for(const child of customProps.children) _elem.appendChild(child);
	// return configured element
	return _elem;
}

// ========================================================
// element arrangement and visibility
// ========================================================

function setParent(elem, parent) {
	parent.appendChild(elem);
}

function moveElem(elem, direction) {
	if(direction > 0) direction++;// skips the element itself
	const parent = elem.parentElement;
	const children = [...parent.children];
	const oldInd = children.findIndex(e => e==elem);
	const newInd = Math.min(Math.max(oldInd + direction, 0), children.length);
	parent.insertBefore(elem, children[newInd]);
}

function inlineElem(elem) {
	const p1 = elem.parentNode;
	const p2 = elem.parentNode.parentNode;
	p1.remove();
	p2.appendChild(elem);
}

function hideElem(elem) {
	if(elem.style.display === "none") return;
	elem.displayPrev = elem.style.display;
	elem.style.display = "none";
}

function showElem(elem) {
	if(elem.style.display !== "none") return;
	elem.style.display = elem.displayPrev ?? "";
}

function qallRemove(sel) { document.querySelectorAll(sel).forEach(elem => elem.remove()); }
function qallInline(sel) { document.querySelectorAll(sel).forEach(elem => inlineElem(elem)); }
function qallHide(sel) { document.querySelectorAll(sel).forEach(elem => hideElem(elem)); }
function qallShow(sel) { document.querySelectorAll(sel).forEach(elem => showElem(elem)); }

// ========================================================
// styles and classes
// ========================================================

function appendStyleClass(elem, className) {
	elem.className += " " + className;
}

function appendStyleObject(elem, style = {}) {
	if(!elem) return false;
	const arr = Object.entries(style);
	arr.forEach(ent => { elem.style[ent[0]] = ent[1]; });
	return true;
}

function appendStyleString(elem, style="") {
	if(!elem) return false;
	const arr = style.split(";").filter(s => s.includes(":"));
	arr.forEach(s => {
		const a = s.split(":").map(v => v.trim());
		elem.style[a[0]] = a[1];
	});
	return true;
}

function addClass(elem, className) { elem.classList.add(className); }
function remClass(elem, className) { elem.classList.remove(className); }

// ========================================================
// Misc
// ========================================================

function cycleAttributeValue(obj, attrib, values) {
	let I = values.length;
	for(let i=0;i<I;i++) if(obj[attrib] === values[i]) {
		obj[attrib] = values[(i+1)%I];
		return;
	}
}

function isVisible(elem) {
	const rect = elem.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
}

function applyTodoOutline(elem) { appendStyleString(elem, "outline: #E99 3px dashed; outline-offset: -1px;"); }
function clearTodoOutline(elem) { appendStyleString(elem, "outline:; outline-offset:;"); }

// ========================================================
// EOF
// ========================================================



