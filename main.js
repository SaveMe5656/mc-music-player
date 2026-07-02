// initialize variables
/** music player */
let player = {
	audio: new Audio
};
/** click sound */
const click = new Audio("assets/click.mp3");
/** music JSON metadata @type {object} */
let trackMeta;
/** track exclusivity tags */
let tags;// = [ "menu", "Chaos Cubed" ];

// setup function
async function setup() {
	// fetch track metadata from JSON
	trackMeta = await fetch('assets/music/tracks.json')
		.then(response => response.json());

	// fetch new <main> code
	player.html = await fetch("assets/player.html")
		.then(response => response.text());
}

// main function
function main() {
	// init document body
	document.querySelector("main").innerHTML = player.html;

	// finish music player setup
	player = {
		...player,
		track: {
			albumCover: document.getElementById("track-album-cover"),
			title: document.getElementById("track-title"),
			artist: document.getElementById("track-artist"),
			album: document.getElementById("track-album-title")
		},
		controls: {
			scrubber: document.getElementById("player-scrubber"),
			currentTime: document.getElementById("player-currentTime"),
			duration: document.getElementById("player-duration"),
			playbackToggle: document.getElementById("player-playbackToggle"),
			restartTrack: document.getElementById("player-restartTrack"),
			playbackType: document.getElementById("player-playbackType")
		}
	};

	// enable click sound for interactable page elements
	[...document.querySelectorAll("input[type='range']"), ...document.querySelectorAll(".img-small-button"), document.getElementById("temp-tagSwitcher")]
		.forEach(element => element.addEventListener("click", () => { click.currentTime = 0; click.play(); }));

	// init audio playback scrubber
	player.controls.scrubber.max
		= (parseInt(getComputedStyle(player.controls.scrubber).width)
			- parseInt(getComputedStyle(player.controls.scrubber, "::-moz-range-thumb").width)
		) / parseInt(getComputedStyle(player.controls.scrubber).getPropertyValue("--scale-modifier"));

	// init play/pause button
	player.audio.onplay = () => player.controls.playbackToggle.src = "assets/player/pause.png";
	player.audio.onpause = () => player.controls.playbackToggle.src = "assets/player/play.png";

	// init audio playback sync to custom player
	player.audio.ontimeupdate = () => {
		// synchronize scrubber position
		player.controls.scrubber.value = player.audio.currentTime
			? player.controls.scrubber.max * player.audio.currentTime / player.audio.duration
			: 0;
		// update time parameters
		for (let i of ["currentTime", "duration"]) {
			const element = player.controls[i],
				timestamp = player.audio[i];
			if (isNaN(timestamp)) element.innerHTML = "-:--";
			else element.innerHTML = Math.floor(timestamp / 60).toString()
				+ ":"
				+ Math.floor(timestamp - (Math.floor(timestamp / 60) * 60)).toString().padStart(2, 0);
		};
	};

	// init temporary tag switcher
	document.getElementById("temp-tagSwitcher").onclick = async function (init) {
		this.value = (this.value + 1) & 1;
		this.src = 'assets/tagMode-' + this.value + '.png';

		if (init != 1) {
			if (this.value) {
				tags = undefined;
				while (player.controls.playbackType.value != 2)
					player.controls.playbackType.onclick();
			} else {
				tags = ["menu", "Chaos Cubed"];
				while (player.controls.playbackType.value != 0)
					player.controls.playbackType.onclick();
			}

			await playNext(); player.audio.pause();
		}
		else while (player.controls.playbackType.value != 1)
			player.controls.playbackType.onclick();

	};
	document.getElementById("temp-tagSwitcher").onclick(1);

	// init audio autoplay
	player.audio.onended = () => {
		if (player.controls.playbackType) {
			// disable player controls
			player.controls.scrubber.onchange = undefined;
			player.controls.playbackToggle.onclick = undefined; player.controls.playbackToggle.src = "assets/player/play.png";
			player.controls.restartTrack.onclick = undefined;

			// clear player info
			player.track.albumCover.src = "assets/music/covers/waiting.png";
			player.track.title.innerHTML = "Waiting...";
			player.track.artist.innerHTML = player.track.album.innerHTML = "???";
			player.controls.currentTime.innerHTML = player.controls.duration.innerHTML = "-:--";
			player.controls.scrubber.value = 0;

			// set timeout to play new track
			let timeout = 3e5 * player.controls.playbackType.value;
			player.timer = setTimeout(playNext, Math.random() * timeout + timeout);
		} else playNext();
	};

	// init playback mode
	player.controls.playbackType.onclick();

	// reveal content
	document.getElementById("loading").remove()
	document.querySelector("main").removeAttribute("style");

	// attempt automatic audio playback
	playNext();
}

async function playNext() {
	// enable player controls
	player.controls.scrubber.onchange = () => player.audio.currentTime = player.controls.scrubber.value / player.controls.scrubber.max * player.audio.duration;
	player.controls.playbackToggle.onclick = function (forcePlay) {
		if (player.audio.paused || forcePlay == 1)
			player.audio.play();
		else
			player.audio.pause();
	};
	player.controls.restartTrack.onclick = () => {
		player.audio.currentTime = 0;
		player.controls.playbackToggle.onclick(1);
	};

	// queue up a random track
	let track;
	do {
		track = trackMeta.tracks[Math.floor(Math.random() * trackMeta.tracks.length)];
	}
	// retry if track doesn't match given parameters
	while (Array.isArray(tags) && tags.length != 0 && !tags.some(element => [track.title, track.artist, track.album, ...(track.tags || []), ...(track.biomes || [])].includes(element)));

	// update audio element
	player.audio.src = "assets/music/" + track.path

	// update player displayed album cover
	let albumCover = trackMeta.albums[track.album];
	typeof albumCover == "object" && (albumCover = albumCover[track.title]);
	player.track.albumCover.src = "assets/music/covers/" + albumCover;

	// update player track metadata
	for (let i of ["title", "artist", "album"])
		player.track[i].innerHTML
			= (track[i] || "???");

	// attempt audio playback
	try {
		await player.audio.play();
		player.controls.playbackToggle.src = "assets/player/pause.png"; // indicator to pause on success
	}
	catch { player.controls.playbackToggle.src = "assets/player/play.png"; } // indicator to play on fail
}

// execute setup function; then main function
setup().then(main);
