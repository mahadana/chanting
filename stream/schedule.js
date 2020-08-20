
let LIVESTREAM;
LIVESTREAM = {
  generateUrl: function() {
    const info = LIVESTREAM.info;

    //figure out today's date
    const now = new Date();

    // will give us "thursday" or whatever
    //TODO: this will break in non-us locales. Whatevs.
    const todayName = now.toLocaleDateString(undefined, {weekday: 'long'}).toLowerCase();
    const todayInfo = info.schedule[todayName];
    console.log("today info",todayInfo);

    let url;

    if(!todayInfo) {
      //if there's no override for today, that means we should use the livestream
      url = info.livestreamUrl
    }
    else {
      // else, there's an override. Ie, there's no livestream
      url = "https://www.youtube.com/embed/"+todayInfo.youtubeVideoId;

      // set start time for video

      // The user will start this many seconds into the livestream based on when they join
      // compute start by number of seconds after start time.
      const secondsSinceVideoStart = 0 - LIVESTREAM.secondsUntilStart(); // must use the negative of this function
      console.log("seconds since start", secondsSinceVideoStart)
      const offset = secondsSinceVideoStart + (todayInfo.startOffset ? todayInfo.startOffset : 0);
      url += "?start="+offset;

      //autoplay the video at that start time
      url += "&autoplay=1&mute=1";
    }

    // set default settings
    url += "&playsinline=1"; //make sure you can't full screen it so we can show the chant option

    console.log(url);
    return url;
  },
  /**
   * Returns positive if it's in the future, negative if after
   */
  secondsUntilStart: function() {

    const startOfDayInSeconds = (new Date()).setHours(0, 0, 0, 0) / 1000;

    return Math.floor((startOfDayInSeconds + LIVESTREAM.info.startTimeInSeconds) - (new Date().getTime() / 1000)) ;
  },
  info: {
    startTimeInSeconds: 68400,  //7pm = 68400seconds from start of day
    livestreamUrl: "https://www.youtube.com/embed/live_stream?channel=UCFAuQ5fmYYVv5_Dim0EQpVA",
    schedule: {
      /*
        EXAMPLE:

        monday: null, //null means just default back to the default livestream url
        tuesday: {
          url: "http://blah.com/video/12345"
          startOffset: 15
        }

       */
      sunday: {
        youtubeVideoId: "zwuKRGndLN0",
        startOffset: 0,
      },
      monday: {
        youtubeVideoId: "zwuKRGndLN0",
        startOffset: 0,
      },
      tuesday: null,
      wednesday: {
        youtubeVideoId: "zwuKRGndLN0",
        startOffset: 0,
      },
      thursday: {
        youtubeVideoId: "zwuKRGndLN0",
        startOffset: 0,
      },
      friday: null,
      saturday: null,
    }
  }
}