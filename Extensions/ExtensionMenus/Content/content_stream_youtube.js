
if(location.hostname.includes("youtube.com")) {
console.log("<> content: youtube");

// ============================================================
// selectors and element finders
// ============================================================

// page element finders
const getElem_video = () => document.querySelector(".html5-main-video");
const getElem_title = () => document.querySelector("#above-the-fold #title h1 yt-formatted-string");
const getElem_owner = () => document.querySelector("#above-the-fold #channel-name #text a");
const getElem_postDate = () => {
	return (
		document.querySelector("ytd-watch-info-text tp-yt-paper-tooltip #tooltip")
	??	document.querySelector("ytd-watch-info-text #info")?.children[2]);
};

// item finders
const getElem_items = () => {
	const selectors = [
		"ytd-compact-video-renderer",
		"ytd-rich-item-renderer",
	];
	const elems = [];
	selectors.forEach(sel => document.querySelectorAll(sel).forEach(elem => elems.push(elem)));
	return elems;
};

// item element finders
const getElem_item_url		= (elem) => elem.querySelector("a");
const getElem_item_title	= (elem) => elem.querySelector("#video-title");
const getElem_item_owner	= (elem) => elem.querySelector("#channel-name #text-container");
const getElem_item_postDate = (elem) => elem.querySelector("#metadata-line");
const getElem_item_duration = (elem) => elem.querySelector("badge-shape");
const getElem_item_image	= (elem) => elem.querySelector("img");

/*
// item finders
const getElem_items = () => {
	const selectors = [
		"yt-lockup-view-model.ytd-watch-next-secondary-results-renderer"
	];
	const elems = [];
	selectors.forEach(sel => document.querySelectorAll(sel).forEach(elem => elems.push(elem)));
	return elems;
};

// item element finders
const getElem_item_url		= (elem) => elem.querySelector("a");
const getElem_item_title	= (elem) => elem.querySelector("yt-lockup-metadata-view-model h3");
const getElem_item_owner	= (elem) => elem.querySelectorAll("yt-lockup-metadata-view-model .yt-content-metadata-view-model-wiz__metadata-row")[0];
const getElem_item_postDate = (elem) => elem.querySelectorAll("yt-lockup-metadata-view-model .yt-content-metadata-view-model-wiz__metadata-row")[1];
const getElem_item_duration = (elem) => elem.querySelector("badge-shape");
const getElem_item_image	= (elem) => elem.querySelector("img");
*/

// ============================================================
// journal configuration
// ============================================================

journal_site = "youtube";
journal_blankEntry_func = journal_blankEntry_video;
journal_parseEntry_func = journal_parseEntry_video;

journal_getKey_url = (url) => {
	// https://www.youtube.com/watch?v=0vp6XgoUOz4&list=PLieay8-vUaFh9pWZOO553OhDF6cLNOSAr&index=2
	// https://www.youtube.com/shorts/CNkJeyttKvo
	// https://youtu.be/1hg4Dq6Pj8w
	if(url.includes("https://www.youtube.com/watch?v="))	return new URL(url).searchParams.get("v");
	if(url.includes("https://www.youtube.com/shorts/"))		return new URL(url).pathname.split("/").slice(-1)[0];
	if(url.includes("https://youtu.be/"))					return new URL(url).pathname.split("/").slice(-1)[0];
	return url;
}

journal_gatherEntryData_page = () => {
	return {
		score:		1,
		url:		urlRemoveSearchParams(getElem_video()?.baseURI, ["t"]),
		owner:		getElem_owner()?.innerHTML,
		title:		getElem_title()?.innerText,
		duration:	Math.round(getElem_video()?.duration),
		postDate:	getElem_postDate()?.innerText.trim(),
	};
};

journal_gatherEntryData_item = (elem) => {
	const ts = getElem_item_duration(elem)?.innerText?.trim();
	//const vid_url = getElem_item_url(elem)?.href;
	//const vid_id = new URL(vid_url).searchParams.get("v");
	//const img_url = `https://img.youtube.com/vi/${vid_id}/mqdefault.jpg`;// still fails strict CORS?
	return {
		score:		1,
		url:		urlRemoveSearchParams(getElem_item_url(elem)?.href, ["t"]),
		owner:		getElem_item_owner(elem)?.innerText?.trim(),
		title:		getElem_item_title(elem)?.innerText?.trim(),
		duration:	(ts ? parseTimestamp(ts) : null),
		postDate:	getElem_item_postDate(elem)?.innerText?.trim(),
		imageUrl:	getElem_item_image(elem).src,
	};
};

// ========================================================
// menu
// ========================================================

const yt_menu = addMenu("yt_menu", corner_menu, "menu", false);
const yt_buttonGrid = addGrid("yt_buttonGrid", yt_menu, [1,1]);

// ========================================================
// element clean-up
// ========================================================

function yt_remove_stylesheets() {
	const stylesheets = document.querySelectorAll("style");
	stylesheets.forEach(sheet => { sheet.disabled = true; });
	const selectors = ["style.searchbox", "style.kevlar_global_styles"];
	selectors.forEach(sel => { qsel(sel).disabled = false; });
}
//yt_remove_stylesheets();
//setTimeout(yt_remove_stylesheets, 5000);


const yt_remove_selectors = [
	// "new" badge under videos in right column
	"ytd-badge-supported-renderer",
	// misc
	"ytd-miniplayer",
	"tp-yt-app-drawer",
	"ytd-permission-role-bottom-bar-renderer",
	"ytd-third-party-manager",
	"ytd-video-quality-promo-renderer",
	"#watch7-content",
	"#microformat",
	"#miniplayer-bar",
];

const yt_inline_selectors = [
	"#author-text span",
];

function yt_clean() {
	console.log("yt_clean(): node count - before", document.querySelectorAll('*').length);
	yt_remove_selectors.forEach(sel => qallRemove(sel));
	yt_inline_selectors.forEach(sel => qallInline(sel));
	console.log("yt_clean(): node count - after", document.querySelectorAll('*').length);
}

// auto-clean
//window.setTimeout(() => yt_clean(), 1500);
//window.setTimeout(() => yt_clean(), 3500);

// ========================================================
// replies
// ========================================================

let forEachSetStyle = (selector, attrib, value) => document.querySelectorAll(selector).forEach(elem => { elem.style[attrib] = value; });

let yt_itvReps = null;
function yt_openReplies() {
	// unhide comments if hidden
	yt_hide(false);
	// clear previous interval
	if(yt_itvReps) clearInterval(yt_itvReps);
	// scroll to comment area if comments no loaded yet
	const comments = document.querySelectorAll("ytd-comment-thread-renderer");
	if(comments.length == 0) {
		document.querySelector("ytd-comments").scrollIntoView();
		return;
	}
	// scroll to bottom to load more comments
	comments[comments.length-1].scrollIntoView();
	// get clickable reply elements
	const sRepliesArrow = "ytd-item-section-renderer .more-button button .yt-spec-button-shape-next__icon";
	const arrowsAll = new Array(...document.querySelectorAll(sRepliesArrow));
	const arrowsVis = arrowsAll.filter(isVisible);
	// click each of them (starting from bottom of page)
	yt_itvReps = setInterval(() => {
		const selHide = [
			"#expander-contents ytd-comment-renderer",
			"ytd-comment-thread-renderer ytd-comment-renderer #main",
		];
		if(arrowsVis.length >= 1) {
			// hide stuff to save processing power
			for(const sel of selHide) forEachSetStyle(sel, "display", "none");
			// click next "Show Replies" button
			const elem = arrowsVis.pop();
			elem.scrollIntoView();
			elem.click();
		}
		else {
			clearInterval(yt_itvReps);
			// un-hide stuff
			setTimeout(() => {
				scrollTo(0, 0);
				document.querySelector("ytd-text-inline-expander")?.click();
				for(const sel of selHide) forEachSetStyle(sel, "display", "");
			}, 900);
		}
	}, 500);
	// remove button outline
	clearTodoOutline(yt_buttonReps);
}

// buttons
let yt_buttonReps = addButton("yt_buttonReps", yt_buttonGrid, "Open Replies", yt_openReplies);
applyTodoOutline(yt_buttonReps);

// ========================================================
// show & hide page contents
// ========================================================

const yt_toggle_selectors = [
	"ytd-comments",
	"ytd-miniplayer",
	"#related",
	"#masthead-container",
];

let yt_hideMode = false;
function yt_hide(hide) {
	yt_hideMode = hide;
	// hide elements
	if(hide)	yt_toggle_selectors.forEach(sel => qallHide(sel));
	else		yt_toggle_selectors.forEach(sel => qallShow(sel));
	const pagemg = document.querySelector("#page-manager");
	const fbcont = document.querySelector("#full-bleed-container");
	const player = document.querySelector("#player-container");
	const column = document.querySelector("#columns");
	appendStyleString(player, `object-position: center; object-fit: cover;`);
	appendStyleString(column, `margin: 5px; margin-top: 15px; display:${hide ? "none" : ""};`);
	appendStyleString(fbcont, `max-height: ${hide ? "99vh" : ""}; max-width: ${hide ? "100vw" : ""};`);
	appendStyleString(pagemg, `margin-top: ${hide ? "0px" : "var(--ytd-masthead-height,var(--ytd-toolbar-height))"};`)
	document.documentElement.style.setProperty("--ytd-masthead-height", hide ? "0px" : "56px");
	document.documentElement.style.setProperty("--ytd-toolbar-height", hide ? "0px" : "56px");
	//document.documentElement.style.setProperty("--ytd-watch-flexy-sidebar-width", hide ? "0px" : "400px");
	setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 50);
}

// buttons
let yt_buttonHide = addButton("yt_buttonHide", yt_buttonGrid, "Toggle hide-mode", () => yt_hide(!yt_hideMode));

// ========================================================
// warn about video resolution settings
// ========================================================

let yt_vheight_prev = 0;
let yt_vheight_min = 640;
let yt_vheight_itv = 0;
let yt_vheight_alert_min = true;
let yt_vheight_alert_changed = true;
function yt_check_video_resolution() {
	const video = getElem_video();
	const height = video.videoHeight;
	if(yt_vheight_prev !== height) console.log(`[yt_check_video_resolution] height changed (${yt_vheight_prev} -> ${height})`);
	if(video.paused) return;// return early if not playing.
	if(yt_vheight_prev <= 0) {
		yt_vheight_prev = height;
	} else {
		if(height !== yt_vheight_prev && yt_vheight_alert_changed) {
			alert("height changed");
			video.pause();
		}
		if(height < yt_vheight_min && yt_vheight_alert_min) {
			alert("less than min height");
			video.pause();
			yt_vheight_alert_min = false;// disable after first alert.
		}
		yt_vheight_prev = height;
	}
}
yt_vheight_itv = setInterval(() => yt_check_video_resolution(), 1000);

// ========================================================
// init
// ========================================================

// TODO - move element creation to init function
function site_init() {
	let yt_menu_grid = moveMenuContentsToQuickMenu(yt_menu);
	moveElem(yt_menu_grid, -1);
	// add playlist
	const item_getter = getElem_items;
	const item_button_style = "position: absolute; width:25px; height: 90px; left:-15px; top: 0px;";
	const item_parent_style = "";
	journal_playlist_init(item_getter, item_button_style, item_parent_style);
}
site_init();

// ========================================================
// EOF
// ========================================================

}



