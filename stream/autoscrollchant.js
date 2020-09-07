ChantAutoScroll = {


  configure: function ({bookNum, startPageNum, scrollData}) {
    const holder = document.getElementById('book'+bookNum+'images').parentElement;
    //allow instance functions to reference static constants
    const constants = this.constants;

    this.instance = {
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
        return holder.scrollTop;
      },

      _scrollRateInPercentageOfPagePerIntervalForPage: function(pageNum) {
        // scrollRate is a number 0 to 100, so convert from percentage to ratio by dividing by 100
        return scrollData[0].scrollRate / 100;
      }
    }
    console.log("configured with instance data: ", this.instance)
  },

  isAutoScrolling: false, //a dumb way to track if we are autoscrolling. Only needed for other event listeners
  autoScrollingIntervalFunctionId:null,


  constants:{
    presumedEyeHeightAsFractionOfPage: 0.5,
    scrollingIntervalInMilliseconds: 10,
    marginHeightTopConstant: 0.045,
    marginHeightBottomConstant: 0.045,
    marginScrollMultiplier: 2, // scroll this many times faster in the margin
  },

  /**
   * If the user hits pause, it should not resume scrolling later. Remove all listeners for scrolling
   *
   */
  userHitPause: function(){
    this.cancelAutoScrolling('user hit pause');
  },

  /**
   * Completely stops all autoscrolling functionality and removes listeners
   * Should be used instead of stop when the intention is to be "finished" with all autoscrolling behavior
   * @param optionalReasonString
   */
  cancelAutoScrolling: function(optionalReasonString){
    this._removeAllScrollingListeners(); //todo: remove. And now cancel is redundant as there is no longer any "resume" functionality
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

    //hide the pause button
    document.getElementById("stop-scrolling-button"+this.instance.bookNum).style.display = "none"
  },

  /**
   * When autoscrolling from start, we assume a delay for the user to reach halfway down the page
   * So, to keep things simple, we just compute the assumed delay in ms, and then fire of autoscroll from there
   */
  startAutoScrollingFromStart: function () {
    //start autscrolling once the user's eye has reached approximately middle of the page
    const delayBeforeStartingInMilliseconds = this.constants.presumedEyeHeightAsFractionOfPage / this.instance._scrollRateInPercentageOfPagePerIntervalForPage(0);
    console.log("delay in MS for starting scroll = "+delayBeforeStartingInMilliseconds+ ", scrollRate = "+this.instance._scrollRateInPercentageOfPagePerIntervalForPage(0));
    const thisInstance = this;
    const timeoutID = setTimeout(function () {
      thisInstance.startAutoScrolling();
    }, delayBeforeStartingInMilliseconds)

    // If the user manually scrolls WHILE WE ARE WAITING TO START, we should cancel this timeout
    //  and resume scrolling from whereever they scroll to
    const scrollStartPosition = this.instance._currentHolderScrollPosition();
    this.instance.holder.addEventListener("ontouchend wheel",function () {
      if(scrollStartPosition !== thisInstance.instance._currentHolderScrollPosition()) {
        //if they did indeed scroll, cancel the delay, and immediately start scrolling from there
        if(!thisInstance.isAutoScrolling) {
          console.log("user scrolled while we were waiting to start scrolling. Cancel timeout and start scrolling")
          clearTimeout(timeoutID);
          thisInstance.startAutoScrolling();
        }
      }
    }, {passive:true})
  },

  startAutoScrolling: function ()
  {
    //cancel any existing intervals, in case they are happening.
    // This probably shouldn't be necessary because if it is there's a bug in my code
    clearInterval(this.autoScrollingIntervalFunctionId);

    this.isAutoScrolling = true;
    //TODO: remove
    // if the user scrolls, we need to stop autoscrolling, and then resume from wherever they stop.
    this._startListeningForUserScrollEvents();

    if(this.instance._currentHolderScrollPosition() - this.instance.originalStartHeightInPx >= 0) {
      // we are within the actual chant (not the index). Proceed

      //reveal the "stop" button (that stops scrolling)
      document.getElementById("stop-scrolling-button"+this.instance.bookNum).style.display = "block"

      //do the autoscroll loop function.
      const thisInstance = this;
      this.autoScrollingIntervalFunctionId = setInterval(function() {
        thisInstance._scrollingIntervalFunction()
      }, this.constants.scrollingIntervalInMilliseconds)
    } else {
      //ie, if the user scrolls back to the TOC, we should stop scrolling because they are looking for a chant
      // We pause though, in case the user ends up scrolling back down. So we don't remove listeners by cancelling
      this.stopAutoScrolling("current position is negative. Holder pos = "+this.instance._currentHolderScrollPosition())
    }

  },
  _scrollingIntervalFunction:function () {
    // we assume that the user is starting with their eye in the middle of the page. Scroll from there.
    let trueHeightInPx = this.instance._currentHolderScrollPosition() + this.instance._startHeightOffset();
    const pageNum = this.instance._currentPageNumber(trueHeightInPx);
    console.log("Scrolling, scrollPos = "+this.instance._currentHolderScrollPosition()+", trueheight = "+trueHeightInPx+" pageNum = "+pageNum);

    //make sure this page exists. If not, it means we have scrolled off the edge
    if(!this.instance._doesPageExistInScrollData(pageNum)) {
      if(pageNum < 0) {
        //user has scrolled up above the top boundary. Pause any scrolling until they scroll down again
        this.stopAutoScrolling("We are above the first page (must be in TOC). Pause scrolling")
        return;
      } else {
        //we are at a page >= 0 where there is no data. We must therefore have reaced the true end
        //we've reached the end. Stop scrolling! Fully cancel and remove listeners
        this.cancelAutoScrolling(" trueEnd on last page. Page = "+pageNum);
        return;
      }

    }

    //if we've reached here, the page exists. Proceed
    //check if we are currently in the margin
    const heightInCurrentPage = this.instance._heightWithinCurrentPage(trueHeightInPx);
    const isCurrentlyInMargin = heightInCurrentPage < this.constants.marginHeightTopConstant * this.instance._getCurrentImageHeight()
      || heightInCurrentPage > (1 - this.constants.marginHeightBottomConstant) * this.instance._getCurrentImageHeight();

    // scroll 2x speed if in margin
    const scrollIncrement = this.instance._scrollRateInPercentageOfPagePerIntervalForPage(pageNum) * this.instance._getCurrentImageHeight()
      * (isCurrentlyInMargin ? this.constants.marginScrollMultiplier : 1);
    //console.log("scrollIncrement", scrollIncrement)

    const newScrollPosition = this.instance._currentHolderScrollPosition() + scrollIncrement;

    //NOTE: I think either this or the check up top might be unnecessary
    if(newScrollPosition > this.instance.holder.scrollHeight - this.instance.holder.clientHeight) {
      //stop scrolling if we're at the bottom. Fully cancel and remove listeners
      this.cancelAutoScrolling(" reached limit of where we can scroll")

    } else {
      //actually scroll
      this.instance.holder.scrollTo(0, newScrollPosition);
    }
  },

  /**
   * To avoid the addition of multiple scrolling listeners as well as clear out behavior if user pauses
   * @private
   */

  _removeAllScrollingListeners: function() {
    //TODO: do something
    const holder = this.instance.holder;
    if(!holder) {
      console.log("no holder element, so can't remove listeners")
      return;
    }

    holder.removeEventListener("ontouchstart",this.handlers.touchStartHandler);
    holder.removeEventListener("wheel touchmove", this.handlers.wheelHandler);
    holder.removeEventListener("ontouchend", this.handlers.touchEndListener);
    console.log("removed all listeners. ");
    //if(getEventListeners && typeof getEventListeners === "function") console.log(getEventListeners(holder));
  },

  _startListeningForUserScrollEvents: function () {
    this._removeAllScrollingListeners();

    const holder = this.instance.holder;
    holder.addEventListener("ontouchstart",this.handlers.touchStartHandler, {passive:true})
    holder.addEventListener("wheel touchmove", this.handlers.wheelHandler, {passive:true})
  }


}


// TODO: remove this commented-out code
//init handlers with "this" attached
ChantAutoScroll.handlers = (function(chantAutoScroll) {
  //once we've started scrolling, we should stop if user scrolls or touches
  let touchStartHandler, touchEndListener, wheelHandler;
  const thisInstance = chantAutoScroll;
  touchStartHandler = function (e) {
    console.log("you touched!", e)
    thisInstance.stopAutoScrolling("touched element")
    thisInstance.instance.holder.removeEventListener("ontouchstart",touchStartHandler)
    thisInstance.instance.holder.addEventListener("ontouchend",touchEndListener, {passive:true})
  }
  touchEndListener = function(e) {
    console.log("touch ended. Resume!", e)
    thisInstance.startAutoScrolling()
    thisInstance.instance.holder.removeEventListener("ontouchend", touchEndListener);
  }
  let resumeFunction;
  wheelHandler = function(e) {
    console.log("wheel touchmove", e)
    thisInstance.stopAutoScrolling("wheeled element")
    clearTimeout(resumeFunction)
    resumeFunction = setTimeout(function () {
      thisInstance.instance.holder.removeEventListener("wheel touchmove",wheelHandler)
      thisInstance.startAutoScrolling()
    }, 100)
  }

  return {
    touchStartHandler: touchStartHandler,
    touchEndListener: touchEndListener,
    wheelHandler: wheelHandler,
  }
})(ChantAutoScroll)
