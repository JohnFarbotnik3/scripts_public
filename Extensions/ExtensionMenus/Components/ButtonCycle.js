
// TODO: create proper extension of HTML Button base class

class ButtonCycle {
	element			= null;
	_onclick		= null;// ButtonCallback[]
	state = 0;
	// constructor
	constructor(props) {
		const {id, children, innerText, innerHTML, title, classList, style, onclick} = props;
		// elements
		const elem = createElementReplace(parent, "button", {id, "class":"_Button ButtonCycle"});
		this.element = elem;
		// content
		if(children) for(const child of children) elem.appendChild(child);
		if(innerHTML) elem.innerHTML = innerHTML;
		if(innerText) elem.innerText = innerText;
		if(title) elem.title = title;
		// styling
		if(classList) for(const item of classList) elem.classList.add(item);
		if(style) elem.style = style;
		// functionality
		if(onclick) {
			this._onclick = onclick;
			elem.onclick = this.onclick;
			elem.oncontextmenu = this.oncontextmenu;
		}
		// initialize
		this.state = 0;
		this.onstatechanged(null);
	}
	// callbacks
	onstatechanged(event) {
		event?.preventDefault();
		if(this.state >= this._onclick.length) this.state = 0;
		if(this.state < 0) this.state = this._onclick.length - 1;
		const {args, func} = this._onclick[this.state];
		func(event, args, this);
	}
	onclick(event) {
		this.state++;
		this.onstatechanged(this.state);
	}
	oncontextmenu(event) {
		this.state--;
		this.onstatechanged(this.state);
	}
};

// TODO: replace instances of these with ButtonCycle class

function addButton_Cycle_setState(elem, arr_text, arr_style, N, n) {
	n = n % N
	elem.state = n;
	elem.innerText = arr_text[n];
	appendStyleString(elem, arr_style[n]);
}
function addButton_Cycle(id, parent, arr_text, arr_func, arr_style) {
	const elem = createElementReplace(parent, "button", {id, "class":"_Button"});
	const N = arr_func.length;
	addButton_Cycle_setState(elem, arr_text, arr_style, N, 0);
	elem.onclick = (event) => {
		const n = elem.state; 
		arr_func[n](event);
		addButton_Cycle_setState(elem, arr_text, arr_style, N, n + 1)
	};
	return elem;
}




