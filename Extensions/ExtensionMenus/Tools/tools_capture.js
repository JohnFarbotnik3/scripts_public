
const capture_menu = Menu.create({id:"capture_menu", parent:corner_menu, text:"Capture"});

const capture_sel_grid = Grid.create({id:"capture_sel_grid", parent:capture_menu, columns:[1]});
const capture_sel_inpt = addTextInput_Selector("capture_sel_inpt", capture_sel_grid, "selector - capture target");
// TODO: use proper extension storage API
const capture_save_selector_key = "capture_sel_inpt.value";
function capture_save_selector() { localStorage.setItem(capture_save_selector_key, capture_sel_inpt.value); }
function capture_load_selector() { const value = localStorage.getItem(capture_save_selector_key); if(value) capture_sel_inpt.setValue(value); }
const capture_savebtn_grid = Grid.create({id:"capture_savebtn_grid", parent:capture_menu, columns:[1,1]});
const capture_savebtn_save = Button.create({id:"capture_savebtn_save", parent:capture_savebtn_grid, text:"Save", onclick:capture_save_selector});
const capture_savebtn_load = Button.create({id:"capture_savebtn_load", parent:capture_savebtn_grid, text:"Load", onclick:capture_load_selector});
const capture_fname_inpt = addTextInput("capture_fname_inpt", capture_menu, oninput=null, placeholder="fname");
const capture_controls_grid = Grid.create({id:"capture_controls_grid", parent:capture_menu, columns:[1,1,1]});
const capture_controls_btn_beg = Button.create({id:"capture_controls_beg", parent:capture_controls_grid, text: "start", onclick:capture_controls_onBeg});
const capture_controls_btn_end = Button.create({id:"capture_controls_end", parent:capture_controls_grid, text:  "stop", onclick:capture_controls_onEnd});
const capture_controls_btn_rst = Button.create({id:"capture_controls_rst", parent:capture_controls_grid, text: "reset", onclick:capture_controls_onReset});
const capture_preview_video = createElementReplace(capture_menu, "video", {id:"c_preview_v", style:"margin:2px;", autoplay:"", controls:"", /*muted:""*/});
const capture_recinfo_grid = Grid.create({id:"capture_recinfo_grid", parent:capture_menu, columns:[1]});
const capture_recinfo_v = addTextDiv("capture_recinfo_v", capture_recinfo_grid, "<v info>");
const capture_recinfo_a = addTextDiv("capture_recinfo_a", capture_recinfo_grid, "<a info>");
capture_recinfo_v.style.fontFamily = "monospace";
capture_recinfo_a.style.fontFamily = "monospace";


// TODO:
// - save media segment as multiple parts, then start new one after max chunk count reached
//const capture_chunk_size_m		= UNIT_MiB * 512;		// default: 512 Mib		TODO
//const capture_chunk_count_m		= UNIT_MiB * 6;			// default: 6			TODO

const UNIT_MiB = 1024 * 1024;

let capture_stream = null;
let capture_stream_is_original = false;
const capture_videoBitsPerSecond	= UNIT_MiB * 200;	// default: 20 Mbps
const capture_audioBitsPerSecond	= UNIT_MiB * 1;		// default: 1 Mbps
const capture_segment_size_m		= UNIT_MiB * 1200;	// default: 1024 MiB, crash: 2048 MiB, crash-intermittent: 1536 Mib?
const capture_dsz_period			= 8000;				// default: 5000 ms
const capture_extra_time			= 0;				// default: 1000 ms
const capture_keyframe_dur			= 8.0;				// default: 5 sec
const capture_keyframe_num			= 300;				// default: 240
let capture_swapchain_m = null;

function capture_getVideo() {
	return document.querySelector(capture_sel_inpt.value);
}

// TODO: move padded number function in StringUtil
function capture_padded_num(num, minLength) {
	const numstr = num.toString();
	const numlen = numstr.length;
	if(numlen >= minLength) return numstr;
	else return `${new Array(minLength - numlen).fill(0).join("")}${numstr}`;
}
function capture_recinfo_str(durationMs, sizeBytes, recentBytes) {
	const dur = Math.floor(durationMs * 0.001);
	const mins = capture_padded_num(Math.floor(dur / 60), 3);
	const secs = capture_padded_num(Math.floor(dur % 60), 2);
	const sizestr = (sizeBytes / (1024*1024)).toFixed(1);
	const durRecent = capture_dsz_period * 0.001;
	const bitrate = recentBytes * 8  / (durRecent <= 0 ? 1 : durRecent);
	const bitrate_k = Number(bitrate / (1024     )).toFixed(0) + " Kbps";
	const bitrate_m = Number(bitrate / (1024*1024)).toFixed(1) + " Mbps";
	return `[${mins}:${secs}] ${sizestr} MiB, ${bitrate < (1024*1000) ? bitrate_k : bitrate_m}`;
}
function capture_update_recinfo_v(duration, sizeBytes, recentBytes) { capture_recinfo_v.innerText = capture_recinfo_str(duration, sizeBytes, recentBytes); }
function capture_update_recinfo_a(duration, sizeBytes, recentBytes) { capture_recinfo_a.innerText = capture_recinfo_str(duration, sizeBytes, recentBytes); }

class MediaRecorderSwapchain {
	constructor(videoElement, mediaStream, options, nameExt, dsz_max_bytes, updateInfoFunc) {
		this.videoElement	= videoElement;
		this.mediaStream	= mediaStream;
		this.options		= options;
		this.nameExt		= nameExt;
		this.updateInfoFunc	= updateInfoFunc;
		this.segCounter		= 0;
		this.duration		= 0;
		this.dsz_max_bytes	= dsz_max_bytes;
		this.dsz_itv		= new Interval(capture_dsz_period, { args:this, func:MediaRecorderSwapchain.func_dsz });
		this.mediaRecorder	= null;
		this.recSaveTarget	= null;
		this.dsz_itv.clear();
		this.updateInfoFunc(0, 0, 0);
	}
	log(str, ...args) {
		console.log(`[MediaRecorderSwapchain:${this.nameExt}] ${str}`, ...args);
	}
	get isStopped() { return this.mediaRecorder?.state === "inactive"; }
	get isPlaying() { return this.mediaRecorder?.state === "recording"; }
	get isPaused () { return this.mediaRecorder?.state === "paused"; }
	async start() {
		this.log("creating new MR");
		const rec = new MediaRecorder(this.mediaStream, this.options);
		// add custom recorder properties.
		rec.blobs = [];
		rec.t_beg = 0;
		rec.t_cut = 0;
		rec.t_end = 0;
		rec.willStopSoon = false;
		// add handlers.
		rec.ondataavailable = (event) => {
			// push new data.
			const blobs = rec.blobs;
			blobs.push(event.data);
			// get data size and update info.
			let sizeBytes = 0;
			let recentBytes = 0;
			for(const blob of blobs) {
				sizeBytes += blob.size;
				recentBytes = blob.size;
			}
			if(rec.state === "recording") this.updateInfoFunc(this.duration, sizeBytes, recentBytes);
			// start a new cycle (based on current amount of data accumulated).
			const tooBig = sizeBytes > this.dsz_max_bytes;
			const almostDone = (this.videoElement.duration - this.videoElement.currentTime) < (capture_extra_time * 2 * 0.001);
			if(rec.state === "recording" && tooBig && !almostDone && !rec.willStopSoon) {
				this.dsz_itv.clear();
				this.duration = 0;
				this.log("starting next MR");
				this.start();
				rec.willStopSoon = true;
				wait(capture_extra_time).then(() => {
					this.log("stopping previous MR");
					rec.stop();
				});
			}
			// ondataavailable() triggered by start() or stop().
			if(rec.state === "inactive") {}
		}
		rec.onstart		= (event) => { this.log("started"); this.setRecBeg(rec); }
		rec.onstop  	= (event) => { this.log("stopped", event); this.setRecEnd(rec, this.mediaRecorder); this.save(event, rec); this.updateInfoFunc(0, 0, 0); }
		rec.onerror 	= (event) => { this.log("errored", event); this.setRecEnd(rec, this.mediaRecorder); this.save(event, rec); this.updateInfoFunc(0, 0, 0); }
		rec.onpause 	= (event) => { this.log("paused"); }
		rec.onresume	= (event) => { this.log("resumed"); }
		rec.start();
		this.mediaRecorder = rec;
		this.dsz_itv.start();
	}
	setRecBeg(rec) {
		const t = this.videoElement.currentTime;
		rec.t_beg = t;
		rec.t_cut = t;
		rec.t_end = t;
	}
	setRecEnd(rec, nextRec) {
		rec.t_end = this.videoElement.currentTime;
		if(nextRec != rec) nextRec.t_cut = rec.t_end;
	}
	pause () { if(this.isPlaying) this.mediaRecorder.pause(); else this.log("cannot pause" , this.mediaRecorder); }
	resume() { if(this.isPaused) this.mediaRecorder.resume(); else this.log("cannot resume", this.mediaRecorder); }
	stop() {
		try { this.mediaRecorder.stop(); } catch(err) { console.error(error); }
		this.dsz_itv.clear();
	}
	static func_dsz(_this) {
		_this.duration += capture_dsz_period;
		_this.requestData();
	}
	requestData() {
		if(this.isPlaying) this.mediaRecorder.requestData();
	}
	async save(event, recorder) {
		// concatenate blobs.
		const arrBlobs = recorder.blobs;
		if(arrBlobs.length === 0) { this.log("cant save 0 blobs"); return; }
		this.log("save()", arrBlobs.length);
		const type = arrBlobs[0].type;
		this.log("type: "+type);
		const data = [];
		for(const blob of arrBlobs) data.push(await blob.bytes());
		const blob = new Blob(data, {type});
		// get type extension.
		const mimeTypes = [
			["video/webm; codecs=vp9"	, ".webm"	],
			["video/webm; codecs=vp8"	, ".webm"	],
			["video/webm"				, ".webm"	],
			["video/mp4"				, ".mp4"	],
			["video/mp2t"				, ".ts"		],
			["video/mpeg"				, ".mpeg"	],
			["audio/ogg; codecs=opus"	, ".opus"	],
			["audio/ogg"				, ".ogg"	],
			["audio/webm"				, ".weba"	],
			["audio/mpeg"				, ".mp3"	],
		];
		let typeExt = "";
		for(const [mtype, ext] of mimeTypes) if(type.includes(mtype)) { typeExt=ext; break; }
		// get timing info.
		// NOTE: this timing method only works if video played normally the entire time (no skips, pauses, etc.).
		const t_beg = recorder.t_beg;
		const t_cut = recorder.t_cut;
		const t_end = recorder.t_end;
		const dt_beg = t_cut - t_beg;
		const dt_end = t_end - t_beg;
		const dt_dur = t_end - t_cut;
		// save timings and media-blob
		this.log("saving blob", blob.size, blob.type, typeExt);
		const title = capture_fname_inpt.value;
		const text = [
			"title, t_beg, t_cut, t_end, dt_beg, dt_end, dt_dur",
			title.replaceAll("\n","_"), t_beg, t_cut, t_end, dt_beg, dt_end, dt_dur, ""
		].join("\n");
		const segN = capture_padded_num(this.segCounter++, 3);
		const fd = `videos/convert_input`;
		const fn = `${title}_${this.nameExt}_${segN}${typeExt}`;
		await downloadData(fd+"_metadata", fn+".txt", text);
		await downloadBlob(fd, fn, blob);
	}
}

async function capture_controls_onReset() {
	console.log("capture_controls_onReset()");
	capture_stream = null;
}

async function capture_controls_onBeg() {
	console.log("capture_controls_onBeg()");
	if(capture_stream) {
		console.log("[capture_controls_onBeg] capture stream is truthy, returning early", capture_stream);
		return;
	}
	const video = capture_getVideo();
	// TODO: try to get original tracks from video object instead.
	// TODO: ^ may require modifying browser to make MediaStreamTracks accessible.
	//capture_stream = video.mozCaptureStream();
	capture_stream = video.mozCaptureStreamUntilEnded();
	capture_stream_is_original = false;
	console.log("[capture_controls_onBeg] cap", capture_stream);
	//const vtracks = capture_stream.getVideoTracks();
	//const atracks = capture_stream.getAudioTracks();
	//console.log("[capture_controls_onBeg] vtracks", vtracks);
	//console.log("[capture_controls_onBeg] atracks", atracks);
	//const vstream  = new MediaStream(); vstream.addTrack(vtracks[0]);
	//const astream  = new MediaStream(); for(const track of atracks) astream.addTrack(track);
	const mtracks = capture_stream.getTracks();
	console.log("[capture_controls_onBeg] mtracks", mtracks);
	const mstream = new MediaStream(); for(const track of mtracks) mstream.addTrack(track);
	// create swapchains
	const mediaRecorderOptions = {
		audioBitsPerSecond:	capture_audioBitsPerSecond,
		videoBitsPerSecond:	capture_videoBitsPerSecond,
		videoKeyFrameIntervalDuration: capture_keyframe_dur,
		//videoKeyFrameIntervalCount: capture_keyframe_num,
	};
	capture_swapchain_m = new MediaRecorderSwapchain(video, mstream, mediaRecorderOptions, "media", capture_segment_size_m, capture_update_recinfo_v);
	capture_swapchain_m.start();
	// additional setup
	capture_init_video();
	capture_preview_video.srcObject = mstream;
	capture_preview_video.play();
}
async function capture_controls_onEnd(event=null) {
	console.log("capture_controls_onEnd()");
	if(!capture_stream) {
		console.log("[capture_controls_onEnd] capture stream is falsy, returning early", capture_stream);
		return;
	}
	capture_swapchain_m.stop();
	capture_preview_video.pause();
	capture_preview_video.srcObject = null;
	if(!capture_stream_is_original) {
		console.log("[capture_controls_onEnd] stopping capture stream tracks", capture_stream);
		capture_stream.getTracks().forEach(track => track.stop());
	}
	capture_stream = null;
}

// ============================================================
// video element event handlers
// ------------------------------------------------------------

function capture_onplay(event) {
	console.debug("[capture_onplay]");
	if(!capture_stream) capture_controls_onBeg();
	else {
		capture_swapchain_m.resume();
	}
	capture_preview_video.play();
}
function capture_onpause(event) {
	console.debug("[capture_onpause]");
	capture_swapchain_m.pause();
	capture_preview_video.pause();
}
function capture_init_video() {
	console.log("[capture_init_video]");
	let success = true;
	// add event listeners to video element
	const video = capture_getVideo();
	let handlers = false;
	if(video) {
		video.onplay		= capture_onplay;
		video.onpause		= capture_onpause;
		handlers = true;
	}
	if(!handlers) success = false;
	// set video title using journal entry page-info gatherer
	let entry = journal_gatherEntryData_page ? journal_gatherEntryData_page() : null;
	if( entry) capture_fname_inpt.value = convert_special_utf8_to_normal_utf8(`${entry.owner} - ${entry.title}`);
	if(!entry) success = false;
	// test direct fetch
	/*
	try {
		fetch(video.currentSrc).then(resp => console.log("[capture_init_video] fetch test", resp));
	} catch(error) {
		console.log("[capture_init_video] fetch test", error);
	}
	//*/
	// test blob fetch
	/*
	try {
		fetch_message_blob(video.currentSrc).then(resp => console.log("[capture_init_video] blob test", resp));
	} catch(error) {
		console.log("[capture_init_video] blob test", error);
	}
	//*/
	console.log("[capture_init_video] init successful?", success, handlers, entry);
	return success;
}

// ============================================================
// site specific behaviour
// ------------------------------------------------------------

capture_load_selector();

if(location.hostname === "www.youtube.com") {
	const grid = moveMenuContentsToQuickMenu(capture_menu);
	grid.style.display = "contents";// TODO - figure out why height="fit-content" does not work.
	const itv = setInterval(() => { if(capture_init_video()) clearInterval(itv); }, 500);
}

// TEST
if(location.hostname === "localhost") {
	const grid = moveMenuContentsToQuickMenu(capture_menu);
	grid.style.display = "contents";// TODO - figure out why height="fit-content" does not work.
	// add event listeners to video element
	const video = capture_getVideo();
	let handlers = false;
	if(video) {
		video.onplay		= capture_onplay;
		video.onpause		= capture_onpause;
		handlers = true;
	}
	// set video title using journal entry page-info gatherer
	const date = new Date();
	capture_fname_inpt.value = [date.getHours(), date.getMinutes()].join("");
}



