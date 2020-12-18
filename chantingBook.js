ChantingBook = {
  showPages: function (bookNum, chantInfo) {
    const pages = chantInfo.pages;
    const holder = document.getElementById('book'+bookNum+'images')

    //hideAll images for book (some may already be displayed if they previously had a chant open)
    for(const element of holder.childNodes) if(element.style && element.nodeName === "IMG") element.style.display = "none"

    const setScaledHeightString = function(height, image) {
      return image.style.height = Math.round(height * image.width / image.naturalWidth) + "px"
    }

    //unhide only the relevant pages, and size them appropriately
    chantInfo.pageScrollData.forEach(pageData => {
      const image = document.getElementById(bookNum+"-"+pageData.pageNum)
      image.style.display = "block"
      if(pageData.trueStartHeightInPx) {
        // rare edge case where we want to start mid-page
        setScaledHeightString(pageData.trueStartHeightInPx, image)
        // in this case, we override the css for all images and attach a "bottom" start
        image.style.objectPosition = "bottom"
      } else if(pageData.trueEndHeightInPx) {
        //if I've managed to find the actual end height, use that (multiplying by a ratio for width)
        setScaledHeightString(pageData.trueEndHeightInPx, image)
      } else {
        //if I haven't gotten around to it, try just using the trueEndHeight (a percentage number I eyeballed)
        // I round up by 5% just to prevent trimming in unnecessary cases
        const height = image.width * image.naturalHeight / image.naturalWidth;
        image.style.height = Math.round(height * Math.min(1, pageData.trueEndHeight+ 0.05)) + "px";
      }

    })

    // scroll to the right spot
    document.getElementById("spacer"+bookNum).style.height =
      Math.round(holder.parentElement.clientHeight * ChantAutoScroll.constants.presumedEyeHeightAsFractionOfPage)+"px";
    document.getElementById("spacer"+bookNum).scrollIntoView(true);


    // AUTOSCROLL!!!
    // When a user loads a chant, we start autoScrolling (with a delay) because we assume that
    //  they are chanting, beginning as soon as they clicked that item.
    //  It's not quite perfect, but the user can scroll to adjust if it starts scrolling
    //  before they actually started chanting.
    ChantAutoScroll.configure({
      bookNum: bookNum,
      startPageNum: pages[0],
      scrollData: chantInfo.pageScrollData,
    })



    //scroll down to the point where it'd match where their eye is at
    //TODO: broken shit
    //ChantAutoScroll.scrollToStartOffset();
    //ChantAutoScroll.startAutoScrolling();

    ChantAutoScroll.startAutoScrollingFromStart();
  },

  closeChantModalClicked: function (bookNum) {
    document.getElementById('toc-'+bookNum).scrollIntoView(true);
    document.getElementById('id0'+bookNum).style.display='none';
    this.showAllPagesForBook(bookNum);
    ChantAutoScroll.controls.closeClicked()
  },

  buttonClickedToShowBookNumber: function(bookNum) {
    //open the appropriate holder div when
    console.log("open clicked for book "+bookNum)
    document.getElementById('id0'+bookNum).style.display='block'
    // need this to fix firefox, which thinks it's so smart for saving prev scroll height!!
    document.getElementById('toc-'+bookNum).scrollIntoView(true)
  },


  showAllPagesForBook: function (bookNum) {
    const holder = document.getElementById('book'+bookNum+'images')

    //show images for book
    for(const element of holder.childNodes) if(element.style) element.style.display = "block"
  },

  load: function(container, data) {

    //sort, since data comes out of order...
    const startPageSort = function(a, b) {
      return a.startPage - b.startPage;
    }

    const that = this;
    data.forEach(info => {
      const bookNum = info.bookNum;

      //first, create the html for the modal
      container.appendChild(this.getModalElementForForBookNumber(bookNum))

      //attach action to html button
      document.getElementById(info.openButtonId).onclick = function() {
        that.buttonClickedToShowBookNumber(bookNum)
      }

      //sort the data in the books
      info.data.sort(startPageSort);

      //load images into divs
      that.loadImageSet(bookNum, info.data.maxPages)

      //load up the TOCs
      that.loadTOC(bookNum, info.data)
    })
  },

  loadImageSet: function (bookNum, maxPage) {
    const holder = document.getElementById('book'+bookNum+'images')
    for(let i=1; i<= maxPage; i++) {
      let newImage = document.createElement("img");
      //<img id="2-73" class="chant-image" src="chanting-book-2/73.png">
      newImage.src = "chanting-book-"+bookNum+"/"+i+".png";
      newImage.className = "chant-image"
      newImage.id = bookNum+"-"+i;
      holder.appendChild(newImage);
    }
  },

  loadTOC: function (bookNum, data) {
    const holder = document.getElementById('toc-'+bookNum)
    const that = this;
    data.forEach(function(obj) {
      //<p><a href="#" onclick=showPages(1, [3,4,5...]); event>Morning chanting</a></p>
      let newPara = document.createElement("p");
      let newLink = document.createElement("a");
      newLink.href = "#"+bookNum+"-"+obj.startPage; //jump to that start page when clicked (so as to scroll TOC out of view)
      newLink.innerHTML = obj.name+" ("+ (obj.startPage- that.constants.START_PAGE_OFFSET ) + ")";
      newLink.addEventListener("click", function(event) {
        event.preventDefault();
        that.showPages(bookNum, obj)
      })
      newPara.appendChild(newLink);
      holder.appendChild(newPara);
    })

  },

  getModalElementForForBookNumber: function (bookNum) {
    const modal = document.createElement("div");
    modal.className = "w3-modal"
    modal.id = "id0"+bookNum;
    modal.innerHTML = `
            <div class="w3-modal-content">
                <div class="w3-container">
                  <span id="start-scrolling-button${bookNum}" style="display:none" onclick="ChantAutoScroll.controls.userHitStart()" class="w3-button w3-display-topright pause-button">[scroll]</span>
                  <span id="stop-scrolling-button${bookNum}" style="display:none" onclick="ChantAutoScroll.controls.userHitPause()" class="w3-button w3-display-topright pause-button">[stop]</span>
                  &nbsp;&nbsp;
                  <span onclick="ChantingBook.closeChantModalClicked(${bookNum})" class="close-button w3-button w3-display-topright">&times;</span>
                  <div class="main-content">
                    <div id="toc-${bookNum}" class="toc"></div>
          
                    <div id="book${bookNum}images" class="image-holder">
                      <div id="spacer${bookNum}"></div>
                    </div>
                  </div>
                </div>
            </div>
      `
    return modal;
  },

  constants: {
    START_PAGE_OFFSET: 9,
  },

}




