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

      _maxHeightForPage: function (pageNumber) {
        return (this.scrollData[pageNumber].trueEndHeight || 1) * this._getCurrentImageHeight();
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
        let timeToSpendOnPageInSeconds = this.scrollData[pageNum].pageTimeInSeconds || constants.defaultPageTimeInSeconds;

        // WARNING: special hacky fix for the first page
        // If it's the first page, we assume that we are going from the start, and want to give the user's eye enough time
        // to get to the middle of the page by the time the 1st page should be complete.
        if( pageNum === 0) {
          //add an extra "half page" worth of intervals
          const slowDownFactor = (holder.clientHeight * constants.presumedEyeHeightAsFractionOfPage / this._getCurrentImageHeight()) + 1;
          timeToSpendOnPageInSeconds *= slowDownFactor;
        }

        const proportionOfTotalPageThatIsText = this.proportionOfPageThatIsText(pageNum);

        // from comments above
        // textTime =  TotalTIme / ((1 - proportionOfTotalPageThatIsText) / (proportionOfTotalPageThatIsText * Margin_SPEED_MULT) + 1)
        const timeToSpendInTextPortionOfPageInSeconds = timeToSpendOnPageInSeconds / ((1 - proportionOfTotalPageThatIsText) / (proportionOfTotalPageThatIsText * constants.marginScrollMultiplier) + 1);

        // textSpeed = proportionOfTotalPageThatIsText / textTime
        const proportionOfPageToScrollPerSecond = proportionOfTotalPageThatIsText / timeToSpendInTextPortionOfPageInSeconds;

        //textSpeedInProportionOfPagePerInterval = textSpeed * (intervalLengthInMs / 1000ms/s)
        const proportionOfPageToScrollPerInterval = proportionOfPageToScrollPerSecond * constants.scrollingIntervalInMilliseconds / 1000;

        // The visible page is the part of the page actually visible to user.
        // Ex:
        // If the element height is 50px, but the images are 100px, then the intervals per VISIBLE page will be 1/2 of the full page
        const proportionOfVisiblePageToScrollPerInterval = proportionOfPageToScrollPerInterval * this._getCurrentImageHeight()  / holder.clientHeight;
        return proportionOfVisiblePageToScrollPerInterval;
      },
      scrollTo: function (scrollToValue) {
        const scrollByValue = scrollToValue - this._currentHolderScrollPosition();
        if(Math.abs(scrollByValue) < constants.scrollIncrementMinimumThresholdInPx) {
          this._currentScrollIncrementValue += scrollByValue;
          if(Math.abs(this._currentScrollIncrementValue) >= constants.scrollIncrementMinimumThresholdInPx) {
            //console.log("scrolling aggregated increments:", scrollByValue,this._currentScrollIncrementValue)
            this.holder.scrollTo(0,this._currentHolderScrollPosition() + this._currentScrollIncrementValue)
            this._currentScrollIncrementValue = scrollByValue - constants.scrollIncrementMinimumThresholdInPx;
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
    defaultPageTimeInSeconds: 100, //very crude guess that each page takes ~100s to finish
  },

  /*
  scrollToStartOffset:function() {
    const additionalScroll = this.instance.holder.clientHeight * this.constants.presumedEyeHeightAsFractionOfPage;
    console.log("scroll UP by ",additionalScroll)
    this.instance.originalStartHeightInPx -= additionalScroll;
    this.instance.scrollTo(this.instance._currentHolderScrollPosition() - additionalScroll);
  },
   */


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
   * So, to keep things simple, we just compute the assumed delay in ms, and then fire of autoscroll from there
   */

  _autoScrollingDelayTimeoutId:null,
  startAutoScrollingFromStart: function () {

    this.startAutoScrolling();
    this.controls.enableStartAndStopButtons();
    this.controls.toggleStartStopButtons();

    /*
    THIS IS THE OLD WAY -- we used to put a delay here to allow the user's eye to reach mid-page
    This however is not very intuitive. So instead we just go extra slow to allow the user to "get ahead"

    //start autscrolling once the user's eye has reached approximately middle of the page
    const delayBeforeStartingInMilliseconds = (this.constants.presumedEyeHeightAsFractionOfPage * this.constants.scrollingIntervalInMilliseconds) / this.instance._fractionOfPageToScrollPerIntervalForPage(0);
    console.log("delay in MS for starting scroll = "+delayBeforeStartingInMilliseconds+ ", scrollRate = "+this.instance._fractionOfPageToScrollPerIntervalForPage(0));
    const thisInstance = this;
    this._autoScrollingDelayTimeoutId = setTimeout(function () {
      thisInstance.startAutoScrolling();
      thisInstance.controls.enableStartAndStopButtons();
      thisInstance.controls.toggleStartStopButtons();
    }, delayBeforeStartingInMilliseconds)

    // If the user manually scrolls WHILE WE ARE WAITING TO START, we should cancel this timeout
    //  and resume scrolling from whereever they scroll to
    const scrollStartPosition = this.instance._currentHolderScrollPosition();
    this.instance.holder.addEventListener("touchmove wheel",function () {
      if(scrollStartPosition !== thisInstance.instance._currentHolderScrollPosition()) {
        //if they did indeed scroll, cancel the delay, and immediately start scrolling from there
        if(!thisInstance.isAutoScrolling) {
          console.log("user scrolled while we were waiting to start scrolling. Cancel timeout and start scrolling")
          clearTimeout(thisInstance._autoScrollingDelayTimeoutId);
          thisInstance.startAutoScrolling();
          thisInstance.controls.enableStartAndStopButtons();
          thisInstance.controls.toggleStartStopButtons()
        }
      }
    }, {passive:true})

     */
  },


  _logStartOfAutoscroll: function() {
    const trueHeightInPx = this.instance._currentHolderScrollPosition() + this.instance._startHeightOffset();
    const pageNum = this.instance._currentPageNumber(trueHeightInPx);
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
    //TODO: remove unless we can figure out a way to get around shitty iOS scrolling
    // if the user scrolls, we need to stop autoscrolling, and then resume from wherever they stop.
    //this._startListeningForUserScrollEvents();

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
      console.log("changing page from x to y:",this._debugLastPageNum, pageNum);
      console.log("_currentHolderScrollPosition: "+this.instance._currentHolderScrollPosition()+
        ", image height: "+this.instance._getCurrentImageHeight()+
        ", clientHeight: "+this.instance.holder.clientHeight+
        ", heightWithinPage (trueHeight): "+this.instance._heightWithinCurrentPage(trueHeightInPx)+
        ", trueHeight: "+trueHeightInPx+
        ", originalHeight: "+this.instance.originalStartHeightInPx+
        ", heightWithinPage (topHeight): "+this.instance._heightWithinCurrentPage(this.instance._currentHolderScrollPosition())
      )
      this._debugLastPageNum = pageNum;
    }
    //console.log("Scrolling, scrollPos = "+this.instance._currentHolderScrollPosition()+", trueheight = "+trueHeightInPx+" pageNum = "+pageNum);

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

    /*
    STUPID BROKEN MARGIN CODE

    //if we've reached here, the page exists. Proceed
    //check if we are currently in the margin
    const heightInCurrentPage = this.instance._heightWithinCurrentPage(trueHeightInPx);
    let scrollIncrement;

    const topMarginInPx = this.constants.marginHeightTopConstant * this.instance._getCurrentImageHeight();
    const bottomMarginInPx = this.constants.marginHeightBottomConstant * this.instance._getCurrentImageHeight();
    if(heightInCurrentPage < topMarginInPx) {
      //scroll to bottom of top margin if in top margin
      scrollIncrement = topMarginInPx - heightInCurrentPage;
      console.log("in top margin", topMarginInPx, heightInCurrentPage)
    } else if(heightInCurrentPage > this.instance._getCurrentImageHeight() - bottomMarginInPx) {
      //scroll to the bottom of the page if we are at the bottom
      scrollIncrement = this.instance._getCurrentImageHeight() - heightInCurrentPage;
      console.log("in bottom margin")
    } else {
      scrollIncrement = this.instance._fractionOfPageToScrollPerIntervalForPage(pageNum) * this.instance._getCurrentImageHeight();
    }
    console.log("scrollIncrement", scrollIncrement)

     */

    const newScrollPosition = this.instance._currentHolderScrollPosition() + scrollIncrement;

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


  /**
   * To avoid the addition of multiple scrolling listeners as well as clear out behavior if user pauses
   * @private
   */
/*
  _removeAllScrollingListeners: function() {
    const holder = this.instance.holder;
    if(!holder) {
      console.log("no holder element, so can't remove listeners")
      return;
    }
    holder.removeEventListener("wheel", this.handlers.wheelHandler);
    holder.removeEventListener("touchmove", this.handlers.touchMoveHandler);
    console.log("removed all listeners. ");
    //if(getEventListeners && typeof getEventListeners === "function") console.log(getEventListeners(holder));
  },

  _startListeningForUserScrollEvents: function () {
    this._removeAllScrollingListeners();

    const holder = this.instance.holder;
    holder.addEventListener("wheel", this.handlers.wheelHandler, {passive:true})
    holder.addEventListener("touchmove", this.handlers.touchMoveHandler, {passive:true})
  }
*/

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
      //TODO:
      if(thisInstance.instance._currentHolderScrollPosition() < thisInstance.instance.originalStartHeightInPx) {
        //blah blah
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


// TODO: remove this commented-out code. And iOS SUCKS. Scrolling makes no sense.
/*
//init handlers with "this" attached
ChantAutoScroll.handlers = (function(chantAutoScroll) {
  console.log("initializing handlers")
  //once we've started scrolling, we should stop if user scrolls or touches
  let touchMoveHandler, wheelHandler;
  const thisInstance = chantAutoScroll;
  let resumeFunction;
  wheelHandler = function(e) {
    console.log("wheel", e)
    thisInstance.stopAutoScrolling("wheeled element")
    clearTimeout(resumeFunction)
    resumeFunction = setTimeout(function () {
      console.log("100ms without wheel, resume autoscroll")
      thisInstance.startAutoScrolling()
    }, 100)
  }

  touchMoveHandler = function (e) {
    console.log("touchmove", e)
    thisInstance.stopAutoScrolling("touchmove element")
    thisInstance.isManualScrolling = true;
    let resumeListener;
    resumeListener = function () {
      console.log("done scrolling, resume autoscroll")
      thisInstance.isManualScrolling = false;
      thisInstance.instance.holder.removeEventListener("scroll",resumeListener)
      thisInstance.startAutoScrolling()
    };
    thisInstance.instance.holder.addEventListener("scroll",resumeListener)
  }

  return {
    touchMoveHandler: touchMoveHandler,
    wheelHandler: wheelHandler,
  }
})(ChantAutoScroll)
 */
