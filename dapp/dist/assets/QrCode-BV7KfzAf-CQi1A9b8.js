import{d6 as d,d7 as l,dA as m,ea as u,eb as C,ec as $,e6 as f}from"./index-CXlKrUqI.js";const p=e=>l.jsx("svg",{viewBox:"0 0 50 50",fill:"none",xmlns:"http://www.w3.org/2000/svg",...e,children:l.jsx("rect",{width:"50",height:"50",fill:"black",rx:10,ry:10})});let c=(e,r,t,o,s)=>{for(let i=r;i<r+o;i++)for(let a=t;a<t+s;a++){let g=e==null?void 0:e[a];g&&g[i]&&(g[i]=0)}return e},z=(e,r)=>{let t=u.create(e,{errorCorrectionLevel:r}).modules,o=C(Array.from(t.data),t.size);return o=c(o,0,0,7,7),o=c(o,o.length-7,0,7,7),c(o,0,o.length-7,7,7)},b=({x:e,y:r,cellSize:t,bgColor:o,fgColor:s})=>l.jsx(l.Fragment,{children:[0,1,2].map(i=>l.jsx("circle",{r:t*(7-2*i)/2,cx:e+7*t/2,cy:r+7*t/2,fill:i%2!=0?o:s},`finder-${e}-${r}-${i}`))}),j=({cellSize:e,matrixSize:r,bgColor:t,fgColor:o})=>l.jsx(l.Fragment,{children:[[0,0],[(r-7)*e,0],[0,(r-7)*e]].map(([s,i])=>l.jsx(b,{x:s,y:i,cellSize:e,bgColor:t,fgColor:o},`finder-${s}-${i}`))}),S=({matrix:e,cellSize:r,color:t})=>l.jsx(l.Fragment,{children:e.map((o,s)=>o.map((i,a)=>i?l.jsx("rect",{height:r-.4,width:r-.4,x:s*r+.1*r,y:a*r+.1*r,rx:.5*r,ry:.5*r,fill:t},`cell-${s}-${a}`):l.jsx(f.Fragment,{},`circle-${s}-${a}`)))}),w=({cellSize:e,matrixSize:r,element:t,sizePercentage:o,bgColor:s})=>{if(!t)return l.jsx(l.Fragment,{});let i=r*(o||.14),a=Math.floor(r/2-i/2),g=Math.floor(r/2+i/2);(g-a)%2!=r%2&&(g+=1);let n=(g-a)*e,x=n-.2*n,h=a*e;return l.jsxs(l.Fragment,{children:[l.jsx("rect",{x:a*e,y:a*e,width:n,height:n,fill:s}),l.jsx(t,{x:h+.1*n,y:h+.1*n,height:x,width:x})]})},v=e=>{var i;let r=e.outputSize,t=z(e.url,e.errorCorrectionLevel),o=r/t.length,s=$(2*o,{min:.025*r,max:.036*r});return l.jsxs("svg",{height:e.outputSize,width:e.outputSize,viewBox:`0 0 ${e.outputSize} ${e.outputSize}`,style:{height:"100%",width:"100%",padding:`${s}px`},children:[l.jsx(S,{matrix:t,cellSize:o,color:e.fgColor}),l.jsx(j,{cellSize:o,matrixSize:t.length,fgColor:e.fgColor,bgColor:e.bgColor}),l.jsx(w,{cellSize:o,element:(i=e.logo)==null?void 0:i.element,bgColor:e.bgColor,matrixSize:t.length})]})},y=m.div.attrs({className:"ph-no-capture"})`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${e=>`${e.$size}px`};
  width: ${e=>`${e.$size}px`};
  margin: auto;
  background-color: ${e=>e.$bgColor};

  && {
    border-width: 2px;
    border-color: ${e=>e.$borderColor};
    border-radius: var(--privy-border-radius-md);
  }
`;const L=e=>{let{appearance:r}=d(),t=e.bgColor||"#FFFFFF",o=e.fgColor||"#000000",s=e.size||160,i=r.palette.colorScheme==="dark"?t:o;return l.jsx(y,{$size:s,$bgColor:t,$fgColor:o,$borderColor:i,children:l.jsx(v,{url:e.url,logo:e.hideLogo?void 0:{element:e.squareLogoElement??p},outputSize:s,bgColor:t,fgColor:o,errorCorrectionLevel:e.errorCorrectionLevel||"Q"})})};export{L as C};
