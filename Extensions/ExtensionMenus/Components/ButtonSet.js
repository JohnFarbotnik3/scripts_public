
// TODO: create proper class version of this...
// ^ NOTE: it will extend the Grid class since the parent element will be a grid

class ButtonSet {
	grid		= null;
	buttons		= null;
	_onclick	= null;// ButtonCallback[]
	state		= 0;
	// constructor
	constructor(props) {
		const {id, children, innerText, innerHTML, classList, style, onclick, widths} = props;
		// elements
		const buttons = onclick.map((callback, i) => new Button({
			id:			`${id}_btn_${i}`,
			innerText:	innerText[i],
			innerHTML:	innerHTML[i],
			title:		title[i],
			onclick:	this.onclick,
		}));
		const grid = new Grid({
			id:			`${id}_grid`,
			children:	buttons,
			classList:	classList,
			style:		style,
			widths:		widths ?? new Array(onclick.length).fill(1)
		});
		this.buttons = buttons;
		this.grid = grid;
		// styling
		if(classList) for(const item of classList) elem.classList.add(item);
		if(style) elem.style = style;
		// functionality
		if(onclick) { this._onclick = onclick; }
		// initialize
		this.state = sessionStorage.getItem(`${id}_state`) ?? 0;
		this.onclick(null);
	}
	// callbacks
	onclick(event) {
		if(event) {
			event.preventDefault();
			this.state = this.buttons.indexOf(event.target);
		}
		sessionStorage.setItem(`${id}_state`, this.state);
		const {func, args} = this._onclick[this.state];
		func(event, args, this);
		// update styling to indicate selected button
		for(let i=0;i<this.buttons.length;i++) {
			const classList = this.buttons[i].classList;
			const className = "ButtonSet_selected";
			if(i === this.state) classList.add(className); else classList.remove(className);
		}
	}
};

// TODO: replace instances of these with ButtonSet class

function addButton_Group_func(event, save=true) {
	const button = event.target;
	const {func, args} = button.callback;
	func(args);
	const buttonList = button.buttonList;
	buttonList.forEach(btn => {
		if(btn == button) btn.classList.add("ButtonSet_selected");
		else btn.classList.remove("ButtonSet_selected");
	});
	if(save) addButton_Group_save(button);
}
function addButton_Group_save(button) {
	const p_id = button.parentElement.id;
	const c_id = button.id;
	sessionStorage.setItem(p_id, c_id);
}
function addButton_Group_load(parent) {
	const p_id = parent.id;
	const c_id = sessionStorage.getItem(p_id) ?? null;
	if(c_id) addButton_Group_func({target: document.getElementById(c_id)}, false);
}
function addButton_Group(id, parent, arr_callbacks, arr_text, arr_title, grid_widths=null) {
	const widths = grid_widths ?? new Array(arr_callbacks.length).fill(1.0);
	const grid = addGrid(`${id}_grid`, parent, widths);
	let buttonList = arr_callbacks.map((callback, i) => {
		const btn = addButton(`${id}_${i}`, grid, "", addButton_Group_func);
		btn.innerText = arr_text[i];
		btn.title = arr_title[i];
		return btn;
	});
	buttonList.forEach((btn, i) => btn.callback = arr_callbacks[i]);
	buttonList.forEach((btn, i) => btn.buttonList = buttonList);
	buttonList[0].classList.add("ButtonSet_selected");
	addButton_Group_load(grid);// load previous state and run callback
	return grid;
}


