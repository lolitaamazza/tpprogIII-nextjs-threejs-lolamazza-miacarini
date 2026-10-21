// Identidad visual estable: el orden de la Cosecha no depende del azar de la partida.
const DISTRICTS=[
 ['#a88638','#ead9a8'],['#704840','#c4a49a'],['#267b96','#94d9e8'],['#287c72','#a5d7c7'],
 ['#ae7230','#f1c16c'],['#655284','#c1aedc'],['#456145','#a2bb7d'],['#873e59','#d79db2'],
 ['#9b8150','#dfd1a5'],['#75513b','#c9a477'],['#55784b','#b7cf8a'],['#414e60','#a7bacf'],
];
const EQUIPMENT=['scarf','pack','harness','belt','armband','satchel'];
export function tributeAppearance(index){
 const safe=((Math.trunc(index)||0)%24+24)%24;
 const district=Math.floor(safe/2);const pair=safe%2;
 return {index:safe,district:district+1,number:safe+1,primary:DISTRICTS[district][pair],accent:DISTRICTS[district][1-pair],
 body:pair?'man':'woman',hair:['#b8a08a','#39312c','#8a5c3b','#b8b0a4','#664638','#252322'][district%6],
 height:[.94,1.04,.98,1.08,1,.92][safe%6],width:[.88,1.08,.98,1.16][safe%4],
 equipment:EQUIPMENT[(district+pair*3)%6],side:pair?1:-1,pace:.86+(safe%7)*.055};
}
