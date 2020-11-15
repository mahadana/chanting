ChantAutoScroll = {


  configure: function ({bookNum, startPageNum, scrollData}) {
    const holder = document.getElementById('book'+bookNum+'images').parentElement;
    //allow instance functions to reference static constants
    const constants = this.constants;

    this.instance = {
      _currentScrollIncrementValue:0, //this is necessary because browsers don't do fractional scrollTop. They round.
      bookNum: bookNum, //current book num we are on
      startPageNum: startPageNum, //the start page for this chant
      scrollData: scrollData,//the scroll data for the chant
      //originalStartHeightInPx - he STARTING height, which allows for calculations. We record it at config time.
      // This is possibly brittle if user rotates the device.
      originalStartHeightInPx: holder.scrollTop,
      //TODO: could eliminate need to specify holder by just using a single holder, not 2 holders. Better code.
      //holder = the holding element for this chant. Varies depending on the book number.
      holder: holder,
      //firstImageElement - used only to dynamically (esp for rotating devices) determine the current
      // screen height. Derivative of "holder"
      firstImageElement: document.getElementById(bookNum+"-"+startPageNum),

      //inefficient to keep making new functions with every instance, but whatever, it's cheap and not frequent
      _getCurrentImageHeight: function() {
        return this.firstImageElement.scrollHeight;
      },
      _currentPageNumber: function (scrollHeight) {
        return Math.floor((scrollHeight - this.originalStartHeightInPx) / this._getCurrentImageHeight());
      },

      _startHeightOffset: function() {
        return holder.clientHeight * constants.presumedEyeHeightAsFractionOfPage;
      },

      _doesPageExistInScrollData: function(pageNumber) {
        return !!this.scrollData[pageNumber];
      },

      _heightWithinCurrentPage: function (scrollHeight) {
        return (scrollHeight - this.originalStartHeightInPx) % this._getCurrentImageHeight();
      },

      _currentHolderScrollPosition: function() {
        return this.holder.scrollTop;
      },

      proportionOfPageThatIsText: function(pageNum) {
        //TODO: should probably rename trueEndHeight in the data to be more like proportionOfTotalPageThatIsText
        return this.scrollData[pageNum].trueEndHeight;
      },

      /**
       * It's been a while since I've done math like this....
       bottomMarginTime = bottomMarginHeight / bottomMarginSpeed
       textTime = textHeight / textSpeed
       textSpeed = bottomMarginSpeed / MARGIN_SPEED_MULTIPLIER        (arbitrary constant)

       Therefore...
       bottomMarginHeight / bottomMarginTime = Margin_SPEED_MULT * textHeight / textTime
       bottomMarginHeight / textHeight = Margin_SPEED_MULT * bottomMarginTime / textTime

       proportionOfTotalPageThatIsMargin / ((1-proportionOfTotalPageThatIsMargin) * Margin_SPEED_MULT) =  bottomMarginTime / textTime

       proportionOfTotalPageThatIsMargin / ((1-proportionOfTotalPageThatIsMargin) * Margin_SPEED_MULT) =  (TotalTIme - textTime) / textTime

       proportionOfTotalPageThatIsMargin / ((1-proportionOfTotalPageThatIsMargin) * Margin_SPEED_MULT) + 1 =  TotalTIme / textTime

       Concluding....
       textTime =  TotalTIme / (proportionOfTotalPageThatIsMargin / ((1-proportionOfTotalPageThatIsMargin) * Margin_SPEED_MULT) + 1)
       OR  (transforming 1-proportionOfTotalPageThatIsText for margin)
       textTime =  TotalTIme / ((1 - proportionOfTotalPageThatIsText) / (proportionOfTotalPageThatIsText * Margin_SPEED_MULT) + 1)

       And for speed...
       (proportion of page per second)
       textSpeed = proportionOfTotalPageThatIsText / textTime

       //finally, for intervals...
       textSpeedInProportionOfPagePerInterval = textSpeed / numIntervalsPerSecond
       textSpeedInProportionOfPagePerInterval = textSpeed * (intervalLengthInMs / 1000ms/s)
       
       * @param pageNum
       * @returns {number}
       * @private
       */
      _fractionOfPageToScrollPerIntervalForPage: function(pageNum) {

        //this is the stopwatch time for start and stop of a particular page
        const scrollDataForPage = this.scrollData[pageNum];
        //if I didn't manage to find a recording to make accurate data, then pageTimeInSeconds will be null
        // In this case, I've filled in the data with a default scroll rate, based on data
        let timeToSpendOnPageInSeconds = scrollDataForPage.pageTimeInSeconds || scrollDataForPage.charactersOnPage / scrollDataForPage.charactersPerSecond;

        // WARNING: special hacky fix for the first page
        // If it's the first page, we assume that we are going from the start, and want to give the user's eye enough time
        // to get to the middle of the page by the time the 1st page should be complete.
        if( pageNum === 0) {
          //add an extra "half page" worth of intervals
          //TODO: need to work on this to get first page rate correct
          // the problem: it needs to account for the fact that eyeHeight% of the TEXT needs to slow scroll,
          // and the remaining margin at bottom is what's left. So need to do a smarter calculation
          // Either that, or we need to bring back the delay before scroll start (and all the UX problems that caused)
          const slowDownFactor = (holder.clientHeight * constants.presumedEyeHeightAsFractionOfPage / (this._getCurrentImageHeight() * scrollDataForPage.trueEndHeight )) + 1.2;
          timeToSpendOnPageInSeconds *= slowDownFactor;
        }

        const proportionOfTotalPageThatIsText = this.proportionOfPageThatIsText(pageNum);

        // from comments above
        // textTime =  TotalTIme / ((1 - proportionOfTotalPageThatIsText) / (proportionOfTotalPageThatIsText * Margin_SPEED_MULT) + 1)
        const timeToSpendInTextPortionOfPageInSeconds = timeToSpendOnPageInSeconds / ((1 - proportionOfTotalPageThatIsText) / (proportionOfTotalPageThatIsText * constants.marginScrollMultiplier) + 1);

        // textSpeed = proportionOfTotalPageThatIsText / textTime
        const proportionOfPageToScrollPerSecond = proportionOfTotalPageThatIsText / timeToSpendInTextPortionOfPageInSeconds;

        //textSpeedInProportionOfPagePerInterval = textSpeed * (intervalLengthInMs / 1000ms/s)
        return proportionOfPageToScrollPerSecond * constants.scrollingIntervalInMilliseconds / 1000;

      },

      scrollTo: function (scrollToValue) {
        //dumb code we have to write because the browser doesn't like fractional scroll positions.
        // The increments are too small and it won't scroll. So we accumulate before scrolling
        const scrollByValue = scrollToValue - this._currentHolderScrollPosition();
        if(Math.abs(scrollByValue) < constants.scrollIncrementMinimumThresholdInPx) {
          //console.log(["current = "+this._currentScrollIncrementValue, "scrollBy = "+scrollByValue].join("\n"))
          this._currentScrollIncrementValue += scrollByValue;

          if(Math.abs(this._currentScrollIncrementValue) >= constants.scrollIncrementMinimumThresholdInPx) {
            //console.log("scrolling aggregated increments:", scrollByValue,this._currentScrollIncrementValue)
            this.holder.scrollTo(0,this._currentHolderScrollPosition() + this._currentScrollIncrementValue)
            this._currentScrollIncrementValue  -= constants.scrollIncrementMinimumThresholdInPx;
          }
        } else {
          this.holder.scrollTo(0, scrollToValue);
        }
      }
    }
    console.log("configured with instance data: ", this.instance)
  },

  isAutoScrolling: false, //a dumb way to track if we are autoscrolling. Only needed for other event listeners
  autoScrollingIntervalFunctionId:null,


  constants:{
    scrollIncrementMinimumThresholdInPx: 1,
    presumedEyeHeightAsFractionOfPage: 0.3, //we assume the user's eye will want to be in the middle, not the top
    scrollingIntervalInMilliseconds: 20,
    marginHeightTopConstant: 0.045, //roughly measured using preview
    marginHeightBottomConstant: 0.045,
    marginScrollMultiplier: 20, // scroll this many times faster in the margin
  },


  /**
   * Completely stops all autoscrolling functionality and removes listeners
   * Should be used instead of stop when the intention is to be "finished" with all autoscrolling behavior
   * @param optionalReasonString
   */
  cancelAutoScrolling: function(optionalReasonString){
    //this._removeAllScrollingListeners(); //todo: remove. And now cancel is redundant as there is no longer any "resume" functionality
    this.stopAutoScrolling(optionalReasonString);
  },

  /**
   * Stops the autoscrolling increment function. Does not clear listeners
   * @param optionalReasonString
   */
  stopAutoScrolling: function (optionalReasonString) {
    this.isAutoScrolling = false;
    console.log("stopped autoscrolling"+ (optionalReasonString ? ": "+optionalReasonString : ""))
    clearInterval(this.autoScrollingIntervalFunctionId);
  },

  /**
   * When autoscrolling from start, we assume a delay for the user to reach halfway down the page
   * I tried using a delay, but that was weird UX
   * So we just hack it by scrolling a bit slower on the first page. Not ideal, but....
   */

  _autoScrollingDelayTimeoutId:null,
  startAutoScrollingFromStart: function () {

    this.startAutoScrolling();
    this.controls.enableStartAndStopButtons();
    this.controls.toggleStartStopButtons();

  },


  _logStartOfAutoscroll: function() {
    const trueHeightInPx = this.instance._currentHolderScrollPosition() + this.instance._startHeightOffset();
    const pageNum = this.instance._currentPageNumber(trueHeightInPx);
    console.log("scroll data", this.instance.scrollData)
    console.log("Scrolling, scrollPos = "+this.instance._currentHolderScrollPosition()+", trueheight = "+trueHeightInPx+" pageNum = "+pageNum);
    console.log("start")
  },

  startAutoScrolling: function ()
  {
    this._logStartOfAutoscroll()

    //cancel any existing intervals, in case they are happening.
    // This probably shouldn't be necessary because if it is there's a bug in my code
    clearInterval(this.autoScrollingIntervalFunctionId);

    this.isAutoScrolling = true;

    if(this.instance._currentHolderScrollPosition() - this.instance.originalStartHeightInPx >= 0) {
      // we are within the actual chant (not the index). Proceed

      //do the autoscroll loop function.
      const thisInstance = this;
      this.autoScrollingIntervalFunctionId = setInterval(function() {
        thisInstance._scrollingIntervalFunction()
      }, this.constants.scrollingIntervalInMilliseconds)
    } else {
      //ie, if the user scrolls back to the TOC, we should stop scrolling because they are looking for a chant
      // We pause though, in case the user ends up scrolling back down. So we don't remove listeners by cancelling
      this.stopAutoScrolling("current position is negative. Holder pos = "+this.instance._currentHolderScrollPosition())
      this.controls.toggleStartStopButtons()
    }

  },

  _debugLastPageNum:null,
  _scrollingIntervalFunction:function () {
    // we assume that the user is starting with their eye in the middle of the page. Scroll from there.
    const trueHeightInPx = this.instance._currentHolderScrollPosition() + this.instance._startHeightOffset();
    const pageNum = this.instance._currentPageNumber(trueHeightInPx);
    if(pageNum !== this._debugLastPageNum) {
      const fractionOfPage = this.instance._fractionOfPageToScrollPerIntervalForPage(pageNum);
      console.log("changing page from x to y:",this._debugLastPageNum, pageNum);
      console.log(["_currentHolderScrollPosition: "+this.instance._currentHolderScrollPosition(),
        "image height: "+this.instance._getCurrentImageHeight(),
        "clientHeight: "+this.instance.holder.clientHeight,
        "heightWithinPage (trueHeight): "+this.instance._heightWithinCurrentPage(trueHeightInPx),
        "trueHeight: "+trueHeightInPx,
        "originalHeight: "+this.instance.originalStartHeightInPx,
        "heightWithinPage (topHeight): "+this.instance._heightWithinCurrentPage(this.instance._currentHolderScrollPosition()),
        "fractionOfPageToScrollPerInterv (when in text) "+fractionOfPage,
        //"fractionOfFullPage: "+this.instance._fractionOfFullPageToScrollPerInterval(pageNum),
        "num intervals required for text to pass: "+ (this.instance.scrollData[pageNum].trueEndHeight || 1) / fractionOfPage,
        "computed total text time: "+ ((this.instance.scrollData[pageNum].trueEndHeight || 1) * this.constants.scrollingIntervalInMilliseconds / 1000 / fractionOfPage)
      ].join(",\n"))
      this._debugLastPageNum = pageNum;
    }


    //make sure this page exists. If not, it means we have scrolled off the edge
    if(!this.instance._doesPageExistInScrollData(pageNum)) {
      if(pageNum < 0) {
        //user has scrolled up above the top boundary. Pause any scrolling until they scroll down again
        this.stopAutoScrolling("We are above the first page (must be in TOC). Pause scrolling")
        this.controls.toggleStartStopButtons()
        return;
      } else {
        //we are at a page >= 0 where there is no data. We must therefore have reaced the true end
        //we've reached the end. Stop scrolling! Fully cancel and remove listeners
        this.cancelAutoScrolling(" trueEnd on last page. Page = "+pageNum);
        this.controls.toggleStartStopButtons()
        return;
      }

    }

    let scrollIncrementAsProportionOfPage = this.instance._fractionOfPageToScrollPerIntervalForPage(pageNum);
    // handle the special case of going faster through margin sections
    const currentPageProgress = this.instance._heightWithinCurrentPage(trueHeightInPx) / this.instance._getCurrentImageHeight();
    if(currentPageProgress > this.instance.proportionOfPageThatIsText(pageNum)) {
      //we are in the margin. Use the scroll multiplier to scroll faster through the margin
      scrollIncrementAsProportionOfPage *= this.constants.marginScrollMultiplier;
    }
    const scrollIncrement = scrollIncrementAsProportionOfPage  * this.instance._getCurrentImageHeight();


    const newScrollPosition = this.instance._currentHolderScrollPosition() + scrollIncrement;

    /*
    console.log(["Scrolling",
      "scrollPos = "+this.instance._currentHolderScrollPosition(),
      "trueheight = "+trueHeightInPx,
      "pageNum = "+pageNum,
      "increment = "+scrollIncrement,
      "newScrollPosition = "+newScrollPosition,
    ].join("\n"));*/

    //NOTE: I think either this or the check up top might be unnecessary
    if(newScrollPosition > this.instance.holder.scrollHeight - this.instance.holder.clientHeight) {
      //stop scrolling if we're at the bottom. Fully cancel and remove listeners
      this.cancelAutoScrolling(" reached limit of where we can scroll")
      this.controls.toggleStartStopButtons()
    } else {
      //actually scroll
      this.instance.scrollTo(newScrollPosition);
    }
  },


}

ChantAutoScroll.controls = (function (thisInstance) {

  return {

    /**
     * If the user hits pause, it should not resume scrolling later. Remove all listeners for scrolling
     *
     */
    userHitPause: function(){
      thisInstance.cancelAutoScrolling('user hit pause');
      this.toggleStartStopButtons();
    },

    userHitStart: function() {
      //if before start, zoom to start
      if(thisInstance.instance._currentHolderScrollPosition() < thisInstance.instance.originalStartHeightInPx) {
        thisInstance.instance.scrollTo(thisInstance.instance.originalStartHeightInPx);
      }
      //toggle buttons
      thisInstance.startAutoScrolling()
      this.toggleStartStopButtons()
    },

    closeClicked:function(){
      //cancel everything
      console.log("close was clicked, clear it out")
      clearTimeout(thisInstance._autoScrollingDelayTimeoutId);
      thisInstance.cancelAutoScrolling("user clicked x");
      this.disableStartAndStopButtons()
    },

    toggleStartStopButtons:function() {
      console.log("toggle buttons")
      const stopButton = this._stopButton()
      const stopButtonCurrent = stopButton.style.display+"";
      const startButton = this._startButton();
      const startButtonCurrent = startButton.style.display + "";
      stopButton.style.display = startButtonCurrent;
      startButton.style.display = stopButtonCurrent;
    },

    _stopButton:function() {
      return document.getElementById("stop-scrolling-button"+thisInstance.instance.bookNum);
    },

    _startButton:function(){
      return document.getElementById("start-scrolling-button"+thisInstance.instance.bookNum)
    },

    //show because playback makes sense
    enableStartAndStopButtons: function() {
      this._stopButton().style.display = "none";
      this._startButton().style.display = "block";
    },

    disableStartAndStopButtons: function() {
      this._stopButton().style.display = "none";
      this._startButton().style.display = "none";
    },
  }
})(ChantAutoScroll)

