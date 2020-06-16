//temporary, data is local
const chantData = [
	{
		name: "Suffusion with the Divine Abidings - English",
		audioURL: "2017-12-07 Suffusion with the Divine Abidings - English.mp3",
		text:`[I will abide] pervading one quarter
with a heart imbued with loving-kindness;
Likewise the second, likewise the third,
likewise the fourth;
So above and below, around and everywhere;
and to all as to myself.
I will abide pervading the all-encompassing
world with a heart imbued with loving-kindness;
abundant, exalted, immeasurable, without hostility,
and without ill-will.

I will abide pervading one quarter
with a heart imbued with compassion;
Likewise the second, likewise the third,
likewise the fourth;
So above and below, around and everywhere;
and to all as to myself.
I will abide pervading the all-encompassing
world with a heart imbued with compassion;
abundant, exalted, immeasurable, without hostility,
and without ill-will.

I will abide pervading one quarter
with a heart imbued with gladness;
Likewise the second, likewise the third,
likewise the fourth;
So above and below, around and everywhere;
and to all as to myself.
I will abide pervading the all-encompassing
world with a heart imbued with gladness;
abundant, exalted, immeasurable, without hostility,
and without ill-will.

I will abide pervading one quarter
with a heart imbued with equanimity;
Likewise the second, likewise the third,
likewise the fourth;
So above and below, around and everywhere;
and to all as to myself.
I will abide pervading the all-encompassing
world with a heart imbued with equanimity;
abundant, exalted, immeasurable, without hostility,
and without ill-will.`,
	},
]

const chantIndexDiv = document.getElementById("chantIndex");
const audioElement = document.getElementById("audio");
const chantTextElement = document.getElementById("chantText");


// should probably make this into some sort of singleton that gets reset
let wordTimePoints = [];
let currentTextTrack;


function loadChantIndex() {
	
	//grab data
	//for now just use global
	chantData.forEach((chantInfo, index) => {
		//load div with <a> elements <a class="chantLoder" id="chant1" href="#">Load Chant 1</a>
		// id = chant id
		// onclick = hide index, load audio, load text
   		let newLink = document.createElement("a");	
   		newLink.href = "#";
   		newLink.innerHTML = chantInfo.name;
   		newLink.addEventListener("click", function(event) {
   			event.preventDefault();  
   			//hide index
   			chantIndexDiv.style.display = "none"
   			
   			//load audio element
   			audioElement.src = chantInfo.audioURL;
   			
   			//set up text track for it, just for demo
   			currentTextTrack = audioElement.addTextTrack("metadata")
   			
   			//load chant text, after wrapping in spans
   			const words = chantInfo.text.split(" ")
   			
   			//reset the word time points
   			wordTimePoints = words.map((word, index) =>  { return {word: word, index: index} }) 
   			
   			
   			chantTextElement.innerHTML = words.map((word, index) => {
   					return "<span id='word"+index+"' onclick='wordClicked("+ index +")'>"+word+"</span>"
   			}).join(" ") //eventually make fancy, not just split/join on space
   			
   			
   		})
   		chantIndexDiv.appendChild(newLink);
	})
		
	
}

function wordClicked(wordIndex) {
	
	// store the data
	// replace the latest data point with a more recent one
	wordTimePoints[wordIndex].time = audioElement.currentTime;
	
	// for now it's brittle, just goes to end of file or 1s
	const endForCue = (audioElement.currentTime + 1 > audioElement.duration ? audioElement.duration : audioElement.currentTime + 1)
	
	// add text track
	const cue = new VTTCue(audioElement.currentTime, endForCue, "word"+wordIndex); //BAD -- goes to end of the file for all
	cue.onenter = function() {
		//highlight that span
		document.getElementById("word"+wordIndex).style.background = "yellow";
	}
	cue.onexit = function() {
		document.getElementById("word"+wordIndex).style.background = "none";
	}
	currentTextTrack.addCue(cue)

	
	// the "ith" element of the array is 
	console.log("word # "+wordIndex+ " t="+audioElement.currentTime)	
}



