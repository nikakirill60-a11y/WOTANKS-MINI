// Transcription of the two I–X sheets, not the historical stats in the model viewers.
// ID, name, class, HP, damage/shot, reload SECONDS, pen, hull, turret, km/h, export triangles.
const medium = [
  ['R-OTSU','Renault Otsu','lt',115,36,2.2,38,22,22,22,4860],
  ['HA-GO','Type 95 Ha-Go','lt',170,45,2.3,48,12,12,45,4163],
  ['CHI-HA','Type 97 Chi-Ha','lt',260,60,2.7,68,25,25,40,4002],
  ['CHI-HE','Type 1 Chi-He','mt',390,75,2.6,88,50,50,44,3940],
  ['CHI-NU','Type 3 Chi-Nu','mt',570,120,3.7,124,50,50,39,4867],
  ['CHI-TO','Type 4 Chi-To','mt',810,155,4.2,155,75,75,45,3928],
  ['CHI-RI','Type 5 Chi-Ri','mt',1200,160,3.6,165,75,75,42,4055],
  ['STA-1','STA-1','mt',1350,240,5.8,212,45,70,45,4982],
  ['TYPE-61','Type 61','mt',1650,360,7.4,245,55,114,48,5440],
  ['STB-1','STB-1','mt',1950,360,6.2,258,110,220,53,5372]
];
const heavy = [
  medium[0], // the dashes in the second sheet refer to the same Renault Otsu
  ['I-GOCHI-RO','Type 89 I-Go','mt',190,65,3.5,45,17,17,25,3568],
  ['TYPE-91','Type 91 Heavy','ht',320,75,3.8,58,20,20,25,4853],
  ['TYPE-95','Type 95 Heavy','ht',520,115,4.4,88,35,35,22,2812],
  ['MITSU-108','Mitsu 108','ht',800,240,8.2,125,75,75,35,5144],
  ['O-I','O-I','ht',1150,320,9.5,150,150,150,25,6299],
  ['O-NI','O-Ni','ht',1550,350,9.8,185,175,200,25,5240],
  ['O-HO','O-Ho','ht',1900,380,10.2,210,200,200,25,5071],
  ['TYPE-4-H','Type 4 Heavy','ht',2350,550,14.5,245,250,250,20,4899],
  ['TYPE-5-H','Type 5 Heavy','ht',2900,600,15,255,260,260,25,5096]
];
module.exports = {medium,heavy,unique:[...medium,...heavy.slice(1)]};
