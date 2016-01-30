// load up object of types.
// Allows access via "types.english"
var typeArray = ["pali","english","chinese","metta","mantra","sanskrit","translated"];
var t = {};
for(var i=0;i<typeArray.length;i++) {
  t[typeArray[i]] = i;
}


var Directory = [
  {
    id:1,
    types:[t.english],
    title:"Five subjects for frequent recollection"
  },
  {
    id:2,
    types:[t.pali],
    title:"Itipi so bhagava"
  },
  {
    id:3,
    types:[t.english,t.metta],
    title:"Brahmaviharas"
  },
  {
    id:4,
    types:[t.chinese,t.mantra],
    title:"Na Mo Kuan Shir Yin (x8)"
  },
  {
    id:5,
    types:[t.pali,t.mantra],
    title:"Namo Tassa Bhagavato (x3)"
  },
  {
    id:6,
    types:[t.pali],
    title:"Refuges (Buddham saranam gacchami)"
  },
  {
    id:7,
    types:[t.pali,t.translated],
    title:"The 5 Precepts (with translation)"
  },
  {
    id:8,
    types:[t.sanskrit,t.mantra],
    title:"Gate Gate Paragate"
  },
  
];
