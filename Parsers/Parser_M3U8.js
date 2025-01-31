
// example format:
/*
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#ID3-EQUIV-TDTG:2023-11-10T01:50:31
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-TWITCH-ELAPSED-SECS:0.000
#EXT-X-TWITCH-TOTAL-SECS:20478.963
#EXT-X-PROGRAM-DATE-TIME:2023-11-09T20:09:07.227Z
#EXTINF:10.000,
0.ts
#EXT-X-PROGRAM-DATE-TIME:2023-11-09T20:09:17.227Z
#EXTINF:10.000,
1.ts
#EXT-X-PROGRAM-DATE-TIME:2023-11-09T20:09:27.227Z
#EXTINF:10.000,
2.ts
...
#EXT-X-PROGRAM-DATE-TIME:2023-11-10T01:50:17.227Z
#EXTINF:8.963,
2047.ts
#EXT-X-ENDLIST
*/

function getSubstringAfter(str, a) {
	const i0 = str.indexOf(a) + a.length;
	return str.substring(i0);
}
function getSubstringBetween(str, a, b) {
	const i0 = str.indexOf(a) + a.length;
	const i1 = str.indexOf(b, i0);
	return str.substring(i0, i1);
}
function getLineWithSubstring(lines, sub) {
	for(line of lines) if(line.includes(sub)) return line;
	return null;
}
function getIndexOfLineWithSubstring(lines, sub) {
	for(let i=0;i<lines.length;i++) if(lines[i].includes(sub)) return i;
	return -1;
}
function getLastIndexOfLineWithSubstring(lines, sub) {
	for(let i=lines.length-1;i>=0;i--) if(lines[i].includes(sub)) return i;
	return -1;
}
function getSubstringAfterLineWithSubstring(lines, sub) {
	const i = getIndexOfLineWithSubstring(lines, sub)
	return getSubstringAfter(lines[i], sub);
}

class M3U_Entry {
	static EXT0 = "#EXT-X-PROGRAM-DATE-TIME:";
	static EXT1 = "#EXTINF:";
	date = null;// date of segment
	size = 0.0;// length of segment in seconds
	path = "";// path to segment file
	constructor(lines) {
		this.date = new Date(getSubstringAfter(lines[0], M3U_Entry.EXT0));
		this.size = Number(getSubstringBetween(lines[1], M3U_Entry.EXT1, ","));
		this.path = lines[2];
	}
	toString() {
		let lines = ["","",""];
		lines[0] = M3U_Entry.EXT0 + this.date.toISOString();
		lines[1] = M3U_Entry.EXT1 + this.size.toFixed(3) + ",";
		lines[2] = this.path;
		return lines.join("\n");
	}
	getNextDate() {
		let d = new Date(this.date.getTime());
		d.setMilliseconds(d.getMilliseconds() + this.size * 1000);
		return d;
	}
};

class M3U_Playlist {
	static EXT_HEADER = "#EXTM3U";
	static EXT_FOOTER = "#EXT-X-ENDLIST";
	static EXT_VERSION = "#EXT-X-VERSION:";
	static EXT_TS_SIZE = "#EXT-X-TARGETDURATION:";
	static EXT_PL_TYPE = "#EXT-X-PLAYLIST-TYPE:";
	static EXT_SEQUENCE = "#EXT-X-MEDIA-SEQUENCE:";
	version = 4;
	ts_size = 10.000;
	pl_type = "EVENT";
	sequence = 0;
	entries = [];
	constructor(str_file) {
		const lines = str_file.split("\n");
		const index_entries_beg = getIndexOfLineWithSubstring(lines, M3U_Entry.EXT0);
		const index_entries_end = getLastIndexOfLineWithSubstring(lines, M3U_Playlist.EXT_FOOTER);
		// parse header values
		const lines_beg = lines.slice(0, index_entries_beg);
		this.version = Number(getSubstringAfterLineWithSubstring(lines, M3U_Playlist.EXT_VERSION));
		this.ts_size = Number(getSubstringAfterLineWithSubstring(lines, M3U_Playlist.EXT_TS_SIZE));
		this.pl_type = getSubstringAfterLineWithSubstring(lines, M3U_Playlist.EXT_PL_TYPE);
		this.sequence = Number(getSubstringAfterLineWithSubstring(lines, M3U_Playlist.EXT_SEQUENCE));
		// parse entries
		const lines_ent = lines.slice(index_entries_beg, index_entries_end);
		for(let i=0;i<lines_ent.length;i+=3) this.entries.push(new M3U_Entry([lines_ent[i+0],lines_ent[i+1],lines_ent[i+2]]));
	}
	// expects (string that converts to) a list of intervals in seconds [[t0, t1], [t0, t1], ...]
	filterWithTimeIntervals(str_intervals) {
		// note: added this step for convenience
		const arr_intervals = strToIntervals(str_intervals);
		// get list of entries that fall within intervals
		let timeOffset = 0;// offset of next entry (in seconds) with respect to first entry
		let newEntries = [];
		for(const ent of this.entries) {
			// check if entry is within intervals
			let cond = false;
			let time = timeOffset;
			for(const itv of arr_intervals) {
				let lo = itv[0] - this.ts_size;
				let hi = itv[1];
				if(lo < time && time < hi) { cond = true; break; }
			}
			timeOffset += ent.size;
			// add entry
			if(cond) newEntries.push(ent);
		}
		// update entry dates
		for(let i=1;i<newEntries.length;i++) newEntries[i].date = newEntries[i-1].getNextDate();
		// replace old entry list
		this.entries = newEntries;
		// return
		return this;
	}
	prependURL(url) {
		if(url[url.length-1]!="/") url += "/";
		for(const ent of this.entries) ent.path = url + ent.path;
		// return
		return this;
	}
	toString() {
		return `${M3U_Playlist.EXT_HEADER}
${M3U_Playlist.EXT_VERSION}${this.version}
${M3U_Playlist.EXT_TS_SIZE}${this.ts_size}
${M3U_Playlist.EXT_PL_TYPE}${this.pl_type}
${M3U_Playlist.EXT_SEQUENCE}${this.sequence}
${this.entries.map(ent => ent.toString()).join("\n")}
${M3U_Playlist.EXT_FOOTER}`;
	}
};

// example format
/*
0:21:00, 0:25:00
0:25:30, 0:30:00
0:31:20, 0:33:40
0:36:00, 0:37:35
0:39:00, 0:40:00
0:41:00, 0:44:20
0:48:20, 0:52:20
0:53:10, 0:56:00
0:58:20, 1:01:30
*/

// get intervals in seconds from above timestamps
function strToIntervals(str_tss) {
	str_tss = str_tss.replaceAll("-",":");// just in case I'm using lazy timestamp formatting
	return str_tss.trim().split("\n").map(str_itv => {
	return str_itv.trim().split(",").map(str => {
		const arr = str.trim().split(":").map(s => Number(s));
		return arr[0]*3600 + arr[1]*60 + arr[2]*1;
	});
	});
}

// > Use ffmpeg copy codec to combine *.ts files into a single mp4
// https://superuser.com/questions/692990/use-ffmpeg-copy-codec-to-combine-ts-files-into-a-single-mp4
// https://stackoverflow.com/questions/50455695/why-does-ffmpeg-ignore-protocol-whitelist-flag-when-converting-https-m3u8-stream
// ffmpeg -protocol_whitelist file,https,tls,tcp -i "playlist.m3u8" -codec copy output.ts 2> log.txt
// ^ note: the above "2>" means output stderr to log.txt, since ffmpeg uses stderr rather than stdout
/*
ffmpeg \
-protocol_whitelist file,https,tls,tcp \
-headers 'https://kick.com/' \
-headers 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/120.0' \
-i "playlist_0_1080.txt" -codec copy output_0_1080.ts 2> log_0_1080.txt
*/

// WARNING: it is possible that the way I am currently constructing the M3U8 playlists (or the way I'm using FFMPEG) is causing a very large number of requests in very rapid succession, causing me to get "IP-banned" so-to-speak. With Kick.com, I got HTTP 403 (forbidden) when using ffmpeg (right from the very first segment) but I can still watch the videos through the browser; upon reviewing their terms of service it seems I was blocked for "scraping", with the additional hint of generating a superhuman number of requests.

/*
Note: we can copy the cached segments from the firefox cache,
then CTRL+C -> CTRL+V the files (when selected in our new working cache folder) into a text file, which copies a list of paths we can then use to construct a local M3U file.
*/
//
//


