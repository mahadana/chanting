ChantingBook = {
  showPages: function (bookNum, chantInfo) {
    const pages = chantInfo.pages;
    const holder = document.getElementById('book'+bookNum+'images')

    //hideAll images for book (some may already be displayed if they previously had a chant open)
    for(const element of holder.childNodes) if(element.style && element.nodeName === "IMG") element.style.display = "none"


    //unhide only the relevant pages
    pages.forEach(pageNum => document.getElementById(bookNum+"-"+pageNum).style.display = "block")

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


  showAllPagesForBook: function (bookNum) {
    const holder = document.getElementById('book'+bookNum+'images')

    //show images for book
    for(const element of holder.childNodes) if(element.style) element.style.display = "block"
  },


  load: function(book1, book2) {

    //sort, since data comes out of order...
    const startPageSort = function(a, b) {
      return a.startPage - b.startPage;
    }

    book1.sort(startPageSort);
    book2.sort(startPageSort);

    this.loadImages();
    this.loadTOCs(book1, book2);
  },

  loadImages: function() {
    this.loadImageSet(1,155); //155 pages in book 1, 89  in book 2
    this.loadImageSet(2,	89);
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

  loadTOCs: function(book1, book2) {
    this.loadTOC(1, book1);
    this.loadTOC(2, book2);
  },

  constants: {
    START_PAGE_OFFSET: 9,
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
}




