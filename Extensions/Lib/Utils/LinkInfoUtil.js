
// ========================================================
// string builders - video info
// ========================================================

// time-stamps
function buildTimestamp(dur) {
	if(!dur) return dur;
	dur = Math.round(dur);
	const s = dur % 60; dur = Math.floor(dur / 60);
	const m = dur % 60; dur = Math.floor(dur / 60);
	const h = dur;
	const ss = (s >= 10) ? (""+s) : ("0"+s);
	const mm = (m >= 10) ? (""+m) : ("0"+m);
	const hh = (h >= 10) ? (""+h) : ("0"+h);
	return [hh,mm,ss].join(":");
}
function parseTimestamp(str) {
	if(!str) return str;
	const arr = str.split(":").map(s => Number(s));
	const s = Number(arr.pop() ?? 0);
	const m = Number(arr.pop() ?? 0);
	const h = Number(arr.pop() ?? 0);
	return s + 60 * (m + 60 * (h));
}

// video info
function vid_buildInfo_v4(url, owner, title, date, duration, score=1) {
	const ts = buildTimestamp(duration);
	const dateNow = new Date().toISOString();
	const obj = {score, url, ts, owner, title, date, dateNow};
	return JSON.stringify(obj);
}
function vid_parseInfo_v4(str) {
	const obj = JSON.parse(str);
	return {
		url:		obj?.url,
		owner:		obj?.owner,
		title:		obj?.title,
		date:		obj?.date,
		dateNow:	obj?.dateNow ? new Date(obj?.dateNow) : undefined,
		duration:	parseTimestamp(obj?.ts ?? "0:0:0"),
		score:		obj?.score,
	};
}

// ========================================================
// EOF
// ========================================================

