const chantIndexDiv = document.getElementById("chantIndex");
const audioElement = document.getElementById("audio");
const chantTextElement = document.getElementById("chantText");
const karaokeBuilderElement = document.getElementById("karaokeBuilder");
const instructionsElement = document.getElementById("instructions");

const Airtable = require('airtable');



// should probably make this into some sort of singleton that gets reset
let selectedChantData = {
	//name
	//wordTimePoints
		// [{ word: "blah", index: 0, startTime: 0, endTime: 1.2333}, .... {...} ]
	//fullText
	//rowId -- id of the row in airtable
};


// ======================= LOAD THE DATA ===================================


function loadChantIndex() {
	//load chant data from airtable readonly account
	getChantDataFromAirtable(chantDataFetchedCallback);
}

function getChantDataFromAirtable(completionCallback) {
	const chantData = []
	
	
	const base = new Airtable({apiKey: 'keyRp9BN8f0DZ5JKN'}).base('appXFAnZ3HgMCsYs4'); //keyRp9BN8f0DZ5JKN -- read only of chant types
	base('chant_types').select({}).eachPage(function page(records, fetchNextPage) {
	    // This function (`page`) will get called for each page of records.
	
	    records.forEach(function(record) {
	    	const text = record.get('text');
	        console.log('Retrieved', record.get('Name'), text);
	        if(text) {
	        	chantData.push({
	        		name: record.get("Name"),
	        		text: text,	
	        	})	
	        }
	    });
	    // To fetch the next page of records, call `fetchNextPage`.
	    // If there are more records, `page` will get called again.
	    // If there are no more records, `done` will get called.
	    fetchNextPage();
	
	}, function done(err) {
		completionCallback(chantData);
	});
}

// ======================= BUILD THE CHANT SELECTOR INDEX ===================================

function chantDataFetchedCallback(chantData) {
	
	chantData.forEach((chantInfo, index) => {
		//load div with <a> elements <a class="chantLoder" id="chant1" href="#">Load Chant 1</a>
		// id = chant id
		// onclick = hide index, load audio, load text
   		let newLink = document.createElement("a");	
   		newLink.href = "#";
   		newLink.innerHTML = chantInfo.name;
   		newLink.addEventListener("click", function(event) {
   			event.preventDefault();  
   			//hide index, show the file selector (STEP 2)
   			chantSelected(chantInfo);
   		})
   		chantIndexDiv.appendChild(newLink);
	})
}

// ======================= CHANT SELECTED ===================================

function chantSelected(chantInfo) {
	//buh, global
	selectedChantData.name = chantInfo.name
	selectedChantData.fullText = chantInfo.text

	// UI: hide the last div, show next div in line, update instructions
	chantIndexDiv.style.display = "none"
	document.getElementById("airtableHolder").style.display = "block";
	instructionsElement.innerHTML =
		"Now, select a file from your computer that is of type = '<b>"
		+chantInfo.name+"</b>', and upload to airtable using the form";

	//set the form to have the chant_type prefilled
	document.getElementById("airtableIframe").src =
		"https://airtable.com/embed/shru3Iy9k4JHyBIAJ?backgroundColor=purple&prefill_chant_type="
		+encodeURIComponent(chantInfo.name);

	//configure the button to handle the next action
	// could move this code elsewhere for cleanliness. Putting it here because it's next in logical sequence
	document.getElementById("airtableUploadComplete").onclick = function () {
		document.getElementById("airtableHolder").style.display = "none";
		showAudioFileSelector(chantInfo.name);
	}

	//REFACTOR: can move this around.
	// we can jump the gun since we know what chant_type they've selected. Fill out the info
	const [words, splitTokens] = getWordsAndSplitTokens(chantInfo.text);
	
	//reset the word time points
	selectedChantData.wordTimePoints = words.map((word, index) =>  { return {word: word, index: index} }) 
	
	//pass in the callback "wordClicked", which will be fired when that word is clicked
	recombineWordsAndTokensIntoSpanWrappedHTMLWithCallbackInDiv(words, splitTokens, wordClickedForKaraokeBuilder, chantTextElement);
	
	
}

function recombineWordsAndTokensIntoSpanWrappedHTMLWithCallbackInDiv(words, splitTokens, wordClickedCallback, element) {
	words.forEach((word, index) => {
		const newSpan = document.createElement("span");
		newSpan.id = "word"+index;
		newSpan.onclick = function() { wordClickedCallback(index) }
		newSpan.innerHTML = word + (index < splitTokens.length ? splitTokens[index] : "");
		element.append(newSpan)
	})
}

//returns [words, splitTokens]
// basically think of it as a zipper, starting with words[0], and then alternating to splitToken[0], words[1], etc
function getWordsAndSplitTokens(text) {
		//load chant text, after wrapping in spans
	const wordsBySpace = text.split(" ")
	//handle line breaks
	const words = [];
	const splitTokens = [];
	//get the things we want (regex on word boundary)
	//wrap in spans / create list
	//rebuild html

	for(let spaceWord of wordsBySpace) {
		const splitByLine = spaceWord.split("\n");
		for(let i = 1; i < splitByLine.length; i++) {
			splitTokens.push("\n")
		}
		words.push(splitByLine);
		
		splitTokens.push(" ");
	}
	if(splitTokens.length > 0) splitTokens.pop() // pop off the extra space
	return [words.flat(), splitTokens]
}



// ======================= SELECT AUDIO FILE ===================================

function showAudioFileSelector(chantType) {
	//fetch all recent entries of chant-type
	// when complete, load all entries as links
	const recentUploadsElement = document.getElementById("recentUploads");
	const base = new Airtable({apiKey: 'keyRp9BN8f0DZ5JKN'}).base('appzQalaTVDxWFNUa'); //keyRp9BN8f0DZ5JKN -- read only of chant types
	base('audio_uploads').select({
		filterByFormula: "chant_type = '"+chantType+"'",
	}).eachPage(function page(records, fetchNextPage) {
		// This function (`page`) will get called for each page of records.

		records.forEach(function(record) {
			console.log(record);
			// fill up the rows
			const attachment = record.get("audio_file") ? record.get("audio_file")[0] : null;
			//if row is not empty, and if it hasn't already been filled out.... create new link
			if(attachment && attachment.url && !record.get("fulltext")) {
				const newLink = document.createElement("a");
				newLink.href = "#";
				newLink.innerHTML = chantType+ " ("+attachment.filename+", "+record.get("timestamp")+")";

				newLink.addEventListener("click", function(event) {
					event.preventDefault();
					//hide index, show the file selector (STEP 2)
					audioFileSelected(attachment.url, record.id);
				})
				recentUploadsElement.appendChild(newLink);
			}
		});
		// To fetch the next page of records, call `fetchNextPage`.
		// If there are more records, `page` will get called again.
		// If there are no more records, `done` will get called.
		fetchNextPage();

	}, function done(err) {
		//do nothing
	});
}

function audioFileSelected(url, rowId) {
	document.getElementById("recentUploads").style.display = "none";
	audioElement.src = url;
	selectedChantData.rowId = rowId;
	karaokeBuilderElement.style.display = "block";
	instructionsElement.innerHTML = "Now, press play and click words AS THEY START in the chant audio";
}



// ======================= TAGGING WORDS ===================================


function wordClickedForKaraokeBuilder(wordIndex) {
	
	// store the data
	// replace the latest data point with a more recent one
	selectedChantData.wordTimePoints[wordIndex].time = audioElement.currentTime;

	//add a tooltip with the time to the span
	const clickedSpan =document.getElementById("word"+wordIndex);
	clickedSpan.title = "t="+Math.round(audioElement.currentTime * 100) / 100;
	clickedSpan.style.fontWeight = "bold"
	//make the word bold so you know you clicked it

	
	// the "ith" element of the array is 
	console.log("word # "+wordIndex+ " t="+audioElement.currentTime)	
}



// ======================= COMPLETED TAGGING ===================================




//called from UI
function doneTaggingKaraoke() {
	//UI - reset the current time to = 0
	audioElement.currentTime = 0;
	
	//clean and backfill in place
	cleanAndBackfillPoints(selectedChantData.wordTimePoints, audioElement.duration);
	
	//adds text track which has callback that highlights words as it goes
	syncTextToAudio(audioElement, selectedChantData.wordTimePoints, selectedWordYellow, selectedWordNone)

	// start playing if not playing, scroll to top
	audioElement.play();
	audioElement.scrollIntoView()

	const doneButton = document.getElementById("submitButton");
	doneButton.style.display = "block";

}

function selectedWordYellow(index) {
	//highlight that span
	document.getElementById("word"+index).style.background = "yellow";
}

function selectedWordNone(index) {
  document.getElementById("word"+index).style.background = "none";
}

function submitToServerClicked() {
  if(confirm("this data is good and tested?")) {
    //TEST -- REMOVE LATER. Upload when done
    uploadKaraokeDataToAirtable(selectedChantData, function () {
      alert("thanks! Redirecting you to the index page to see your chant (at bottom)")
      window.location.replace("chantList.html")
    });
  }
}


// clean in place
function cleanAndBackfillPoints(wordTimePoints, audioFileDuration) {
	//iterate through time points
	let currTime = 0
	let currPoints = [];
	for(let index= 0; index < wordTimePoints.length; index++) {
		const point =  wordTimePoints[index];
		
		//it's either got a time, or it's the last point
		let endTimeForPreviousSetOfPoints = point.time;
		
		if(!endTimeForPreviousSetOfPoints) {
			//It doesn't have a time (ie, the user didn't click it)
			//just keep accumulating the "empty" points so we can backfill once we have the next start time
			currPoints.push(point)
			//if it's the last point, we actually want to proceed by filling the points NOW
			if(index == wordTimePoints.length - 1) {
				// This is the last point
				//set the end time as the duration of the audio file
				// and continue to the code below to process all the points
				endTimeForPreviousSetOfPoints = audioFileDuration;
			} else {
				continue; // this is NOT the last point, so let's just keep going
			}
		}
		
		//do simple validation: if the point is BEFORE the last time we had, this is invalid. Throw it out. 
		if(endTimeForPreviousSetOfPoints < currTime) {
			alert("Invalid data. A word that followed an earlier word had a time BEFORE the earlier word. Please refresh and try again")
			return;
		}

		//it has an end, close up the previous ones by backfilling times using a simple linear approximation
		if(currPoints.length > 0) {
			const totalTime = endTimeForPreviousSetOfPoints - currTime;
			const increment = totalTime / currPoints.length;
			
			let loopTime = currTime;
			
			for(let unlabeledPoint of currPoints) {
				unlabeledPoint.startTime = loopTime;
				unlabeledPoint.endTime = loopTime+increment;
				loopTime += increment;
			}
		}
    currPoints = [point] //reset and fill last point
		
			
		//update currTime for next run of the loop
		currTime = endTimeForPreviousSetOfPoints;
	}	
	//fill the last point only if it DID have a selected time, because it wouldn't have been closed out by the above algo
	const lastPoint = wordTimePoints[wordTimePoints.length - 1];
	if(lastPoint.time) {	
		lastPoint.startTime = lastPoint.time;
		lastPoint.endTime = audioFileDuration;
	}
}

//assumes audioELement with spans for each word, with id = "word1", "word2" etc
function syncTextToAudio(audioElement, wordTimePoints, onEnter, onExit) {
	// remove all previous cues from textTrack
  const currentTextTrack = audioElement.textTracks[0] || audioElement.addTextTrack("metadata");
	if(audioElement.textTracks[0] && audioElement.textTracks[0].cues) {
    for(let cue of audioElement.textTracks[0].cues) {
      console.log("removing cue",cue)
			cue.onenter = function () {}
      cue.onexit = function () {}
      //audioElement.textTracks[0].removeCue(cue);
    }
	}



	//now, make it follow the audio!
	//set up text track for it, just for demo

	for(let point of wordTimePoints) {
		
		// add text track
		const cue = new VTTCue(point.startTime, point.endTime, "word"+point.index); 
		cue.onenter = function() { onEnter(point.index) };
		cue.onexit = function() { onExit(point.index) };
		currentTextTrack.addCue(cue)
	}	
}

function uploadKaraokeDataToAirtable(selectedChantData, successCallback) {
	// throwaway publicly editable table
	let defaultEmail = localStorage.getItem("email") || "";
	const email = prompt("Please enter your email to submit to the database", defaultEmail);
	if(!email) alert("chant not submitted (no email, or cancel pressed)");
	
	localStorage.setItem("email", email);
	const base = new Airtable({apiKey: 'keyRp9BN8f0DZ5JKN'}).base('appzQalaTVDxWFNUa'); //public haha bad news
	console.log("type", selectedChantData.name);

	base('audio_uploads').update([
	  {
	  	"id":selectedChantData.rowId,
	    "fields": {
	    	email: email,
	    	chant_type: selectedChantData.name,
	    	data: JSON.stringify(selectedChantData.wordTimePoints),
	    	fulltext: selectedChantData.fullText , //store full text so if chant changes, we have it. Also avoids the need for joins, etc.
	    }
	  },
	], function(err, records) {
	  if (err) {
	    console.error(err);
	    return;
	  }
	  records.forEach(function (record) {
	    console.log("success", record);
      successCallback();
	  });
	});
	
}


// =========================== DISPLAY UPLOADED CHANTS LIST ===========================
let userGeneratedChants;
function loadUserGeneratedChants() {
	userGeneratedChants = [];
	const base = new Airtable({apiKey: 'keyRp9BN8f0DZ5JKN'}).base('appzQalaTVDxWFNUa'); //public haha bad news
	base('audio_uploads').select({}).eachPage(function page(records, fetchNextPage) {
	    // This function (`page`) will get called for each page of records.
	

	
	    records.forEach(function(record) {
	    	
	    	//must have data, chant_type, audio_file, email to be valid
	        console.log('record', record);
	        if(record.get("data") && record.get("chant_type") && record.get("audio_file") && record.get("email") && record.get("fulltext")) {
	        	userGeneratedChants.push(record)	
	        }
	    });
	    // To fetch the next page of records, call `fetchNextPage`.
	    // If there are more records, `page` will get called again.
	    // If there are no more records, `done` will get called.
	    fetchNextPage();
	
	}, function done(err) {
		//once it's done, load up the index
		userGeneratedChants.forEach((record, index) => {
		//load div with <a> elements <a class="chantLoder" id="chant1" href="#">Load Chant 1</a>
		// id = chant id
		// onclick = hide index, load audio, load text
		const newPara = document.createElement("p");
		const displayName = record.get("email").split("@")[0] //make it somewhat anonymous
		newPara.innerHTML = ", created by "+displayName+" at "+record.get("timestamp");
		
   		let newLink = document.createElement("a");	
   		newLink.href = "#";
   		newLink.innerHTML = record.get("chant_type");
   		newLink.addEventListener("click", function(event) {
   			event.preventDefault();  
   			//hide index, show the file selector (STEP 2)
   			userGeneratedChantSelected(record);
   		})
   		newPara.prepend(newLink);
   		chantIndexDiv.appendChild(newPara);
	})
		
	});
}

function userGeneratedChantSelected(record) {
	// load the audio element with correct info
	audioElement.src = record.get("audio_file")[0].url //airtable returns an array of attachments, so have to get first el
	karaokeBuilderElement.style.display = "block"
	chantIndexDiv.style.display = "none"
	instructionsElement.innerHTML = "";
	
	// load chant text, but make it "read only" for now (possibly attach a different listener
	const [words, splitTokens] = getWordsAndSplitTokens(record.get("fulltext"));
	
	//hack, use global to hold data around current chant
	selectedChantData = {
		fullText: record.get("fulltext"),
		name: record.get("chant_type"),
		wordTimePoints: JSON.parse(record.get("data")),
		rowId: record.id,
	}
	
	//pass in the callback "wordClicked", which will be fired when that word is clicked
  recombineWordsAndTokensIntoSpanWrappedHTMLWithCallbackInDiv(words, splitTokens, wordClickedForPlayback, chantTextElement /*global*/);

	//default is yellow mode
	clickedButtonYellowDemo(true) //skip the swap first time around

	
	//start play on the audio
	audioElement.play()
}

// when a word with a particular index is clicked in playback, jump audio to that word.
function wordClickedForPlayback(index) {
	//GLOBAL: audioElement
	//GLOBAL: selectedChantData
	audioElement.currentTime = selectedChantData.wordTimePoints[index].startTime
}

function clickedButtonYellowDemo(skipSwap) {

  document.getElementById("scrollDemoButton").style.display = "block";
  document.getElementById("yellowDemoButton").style.display = "none"

  const scrollHolder =document.getElementById('scrollDemo');
  const yellowHolder = document.getElementById('chantText');

  scrollHolder.style.display = 'none';
  yellowHolder.style.display = 'block'
  if(!skipSwap) {
    const temp = scrollHolder.innerHTML;
    scrollHolder.innerHTML = "";
    yellowHolder.innerHTML = temp;
  }

  // STYLE 1:
  //set up the text track to follow the audio
  syncTextToAudio(audioElement, selectedChantData.wordTimePoints, selectedWordYellow, selectedWordNone)
}

function clickedButtonScrollDemo() {
	document.getElementById("scrollDemoButton").style.display = "none";
	document.getElementById("yellowDemoButton").style.display = "block"

	const scrollHolder =document.getElementById('scrollDemo');
	const yellowHolder = document.getElementById('chantText');

  scrollHolder.style.display = 'block';
  yellowHolder.style.display = 'none'
	const temp = yellowHolder.innerHTML+"";
  yellowHolder.innerHTML = "";
	scrollHolder.innerHTML = temp;


  // STYLE 2:
  // scroll that word to top of scrolling box
  syncTextToAudio(audioElement, selectedChantData.wordTimePoints, function (index) {
    document.getElementById("word"+index).scrollIntoView();
  }, function() {});
}