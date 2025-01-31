
class ComponentPlaylistItem /*extends HTMLElement*/ {
	// constructor
	static create(props) {
		// create and configure element
		let { itemData, btn_skip_onclick, span_div_onmouseenter, span_div_onmouseleave } = props;
		let customProps = { itemData, btn_skip_onclick, span_div_onmouseenter, span_div_onmouseleave };
		const _this = createAndConfigureComponentManually(new ComponentPlaylistItem(), "div", props, customProps);
		_this.classList.add("_PlaylistItem");
		// customize
		const id = props.id;
		const grid = Grid.create({ id: `${id}_grid`, parent: _this, columns: [1, 20] });
		const btn_skip = Button.create({ id: `${id}_btn_skip`, parent: grid, text: "-" });
		const link_div = Link.create({ id: `${id}_link_div`, parent: grid });
		const span_div = addTextDiv(`${id}_text`, link_div, "");
		const span_score = addTextSpan(`${id}_score`, span_div, "score");
		const span_stamp = addTextSpan(`${id}_stamp`, span_div, "timestamp");
		const span_owner = addTextSpan(`${id}_owner`, span_div, "owner");
		const span_title = addTextSpan(`${id}_title`, span_div, "title");
		span_div.classList.add("_PlaylistItem_span_div");
		appendStyleString(grid, "margin: 2px;");
		appendStyleString(btn_skip, "width: 20px; background: #A55; margin: unset;");
		appendStyleString(span_div, "display: block; margin-bottom: 2px; outline: #AAF7 2px solid; cursor: pointer;");
		appendStyleString(span_score, "margin-right:  2px; color: coral; float: right;");
		appendStyleString(span_stamp, "margin-right: 10px; color: yellow; float: right;");
		appendStyleString(span_owner, "color: aquamarine;");
		appendStyleString(span_title, "margin-left:   2px; display: block;");
		_this.links = [link_div];
		_this.spans = [span_score, span_stamp, span_owner, span_title];
		_this.update(itemData);
		btn_skip.onclick = (event) => btn_skip_onclick(_this);
		span_div.onmouseenter = (event) => span_div_onmouseenter(_this);
		span_div.onmouseleave = (event) => span_div_onmouseleave(_this);
		// return
		return _this;
	}
	update(itemData) {
		//console.debug("[ComponentPlaylistItem.update]", itemData);
		this.itemData = itemData;
		const { entry } = itemData;
		if(entry) {
			this.style.display = "";
			const { score, url, title, owner, duration } = entry;
			const links = this.links;
			const spans = this.spans;
			const parts = [ score, buildTimestamp(duration ?? 0), owner, title ];
			links[0].href = url;
			parts.forEach((part, n) => spans[n].innerText = part);
		} else {
			this.style.display = "none";
		}
	}
};

