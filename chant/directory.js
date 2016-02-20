// load up object of types.
// Allows access via "types.english"
var typeArray = ["pali","english","chinese","metta","mantra","sanskrit","translated"];
var CHANTTYPE = {};
for(var i=0;i<typeArray.length;i++) {
  CHANTTYPE[typeArray[i]] = i;
}


var Directory = [
  {
    id:1,
    types:[CHANTTYPE.english],
    title:"Five subjects for frequent recollection"
  },
  {
    id:2,
    types:[CHANTTYPE.pali],
    title:"Itipi so bhagava"
  },
  {
    id:3,
    types:[CHANTTYPE.english,CHANTTYPE.metta],
    title:"Brahmaviharas"
  },
  {
    id:4,
    types:[CHANTTYPE.chinese,CHANTTYPE.mantra],
    title:"Na Mo Kuan Shir Yin (x8)"
  },
  {
    id:5,
    types:[CHANTTYPE.pali,CHANTTYPE.mantra],
    title:"Namo Tassa Bhagavato (x3)"
  },
  {
    id:6,
    types:[CHANTTYPE.pali],
    title:"Refuges (Buddham saranam gacchami)"
  },
  {
    id:7,
    types:[CHANTTYPE.pali,CHANTTYPE.english],
    title:"The 5 Precepts (with translation)"
  },
  {
    id:8,
    types:[CHANTTYPE.sanskrit,CHANTTYPE.mantra],
    title:"Gate Gate Paragate"
  },
  {
    id:9,
    types:[CHANTTYPE.pali,CHANTTYPE.english,CHANTTYPE.mantra],
    title:"Annica Vata Sankhara"
  },
  /*{
    id:10,
    types:[CHANTTYPE.chinese,CHANTTYPE.mantra],
    title:"A Mi Tuo Fu"
  },
  {
    id:11,
    types:[CHANTTYPE.chinese,CHANTTYPE.mantra],
    title:"namo, fundamental teacher"
  },*/
];
