import{da as f,d8 as ze,d7 as e,d6 as xe,em as he,fZ as He,dA as h,f_ as We}from"./index-CXlKrUqI.js";import{T as J,g as Ue,m as _,u as je,V as qe}from"./ModalHeader-CAqKnddp-DW_wjXlK.js";import{t as z,s,e as n,n as i,a as Qe}from"./Value-tcJV9e0L-CgX78Frh.js";import{e as V}from"./ErrorMessage-D8VaAP5m-p7soGqDw.js";import{r as O}from"./LabelXs-oqZNqbm_-DLfZ6dCE.js";import{r as me}from"./Subtitle-CV-2yKE4-36hfrSRv.js";import{e as ue}from"./Title-BnzYV3Is-BwjalVfe.js";import{d as c}from"./Address-BNlptHuN-CBAqY033.js";import{j as Ze}from"./WalletInfoCard-DCGeaps8-CBM7lLVC.js";import{n as pe}from"./LoadingSkeleton-U6-3yFwI-NoVzApt6.js";import{d as Je}from"./shared-FM0rljBt-CJEHr-6r.js";import{o as _e,F as Ge}from"./Checkbox-BhNoOKjX-D7ir79o9.js";import{t as Ke}from"./ErrorBanner-CQERa7bL-DC6Cu_cM.js";import{t as Ye}from"./WarningBanner-D5LqDt95-DtwtGVEQ.js";import{F as Xe}from"./ExclamationCircleIcon--f7xBL0_.js";import{F as ge}from"./ChevronDownIcon-Bb75Znuf.js";import{i as ne}from"./formatters-3ardcB9i.js";function Pe({title:a,titleId:l,...o},m){return f.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:m,"aria-labelledby":l},o),a?f.createElement("title",{id:l},a):null,f.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"}))}const $e=f.forwardRef(Pe);function er({title:a,titleId:l,...o},m){return f.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:m,"aria-labelledby":l},o),a?f.createElement("title",{id:l},a):null,f.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"}))}const fe=f.forwardRef(er);function rr({title:a,titleId:l,...o},m){return f.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:m,"aria-labelledby":l},o),a?f.createElement("title",{id:l},a):null,f.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"}))}const sr=f.forwardRef(rr),ke=h(n)`
  cursor: pointer;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--privy-color-accent);
  svg {
    fill: var(--privy-color-accent);
  }
`;var ie=({iconUrl:a,value:l,symbol:o,usdValue:m,nftName:E,nftCount:p,decimals:t,$isLoading:k})=>{if(k)return e.jsx(te,{$isLoading:k});let y=l&&m&&t?function(w,I,A){let b=parseFloat(w),x=parseFloat(A);if(b===0||x===0||Number.isNaN(b)||Number.isNaN(x))return w;let g=Math.ceil(-Math.log10(.01/(x/b))),d=Math.pow(10,g=Math.max(g=Math.min(g,I),1)),T=+(Math.floor(b*d)/d).toFixed(g).replace(/\.?0+$/,"");return Intl.NumberFormat(void 0,{maximumFractionDigits:I}).format(T)}(l,t,m):l;return e.jsxs("div",{children:[e.jsxs(te,{$isLoading:k,children:[a&&e.jsx(ir,{src:a,alt:"Token icon"}),p&&p>1?p+"x":void 0," ",E,y," ",o]}),m&&e.jsxs(nr,{$isLoading:k,children:["$",m]})]})};let te=h.span`
  color: var(--privy-color-foreground);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.375rem;
  word-break: break-all;
  text-align: right;
  display: flex;
  justify-content: flex-end;

  ${pe}
`;const nr=h.span`
  color: var(--privy-color-foreground-2);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  word-break: break-all;
  text-align: right;
  display: flex;
  justify-content: flex-end;

  ${pe}
`;let ir=h.img`
  height: 14px;
  width: 14px;
  margin-right: 4px;
  object-fit: contain;
`;const tr=a=>{var k,y,w,I,A,b,x,g;let{chain:l,transactionDetails:o,isTokenContractInfoLoading:m,symbol:E}=a,{action:p,functionName:t}=o;return e.jsx(Je,{children:e.jsxs(z,{children:[p!=="transaction"&&e.jsxs(s,{children:[e.jsx(n,{children:"Action"}),e.jsx(i,{children:t})]}),t==="mint"&&"args"in o&&o.args.filter(d=>d).map((d,T)=>{var u,C;return e.jsxs(s,{children:[e.jsx(n,{children:`Param ${T}`}),e.jsx(i,{children:typeof d=="string"&&We(d)?e.jsx(c,{address:d,url:(C=(u=l==null?void 0:l.blockExplorers)==null?void 0:u.default)==null?void 0:C.url,showCopyIcon:!1}):d==null?void 0:d.toString()})]},T)}),t==="setApprovalForAll"&&o.operator&&e.jsxs(s,{children:[e.jsx(n,{children:"Operator"}),e.jsx(i,{children:e.jsx(c,{address:o.operator,url:(y=(k=l==null?void 0:l.blockExplorers)==null?void 0:k.default)==null?void 0:y.url,showCopyIcon:!1})})]}),t==="setApprovalForAll"&&o.approved!==void 0&&e.jsxs(s,{children:[e.jsx(n,{children:"Set approval to"}),e.jsx(i,{children:o.approved?"true":"false"})]}),t==="transfer"||t==="transferWithMemo"||t==="transferFrom"||t==="safeTransferFrom"||t==="approve"?e.jsxs(e.Fragment,{children:["formattedAmount"in o&&o.formattedAmount&&e.jsxs(s,{children:[e.jsx(n,{children:"Amount"}),e.jsxs(i,{$isLoading:m,children:[o.formattedAmount," ",E]})]}),"tokenId"in o&&o.tokenId&&e.jsxs(s,{children:[e.jsx(n,{children:"Token ID"}),e.jsx(i,{children:o.tokenId.toString()})]})]}):null,t==="safeBatchTransferFrom"&&e.jsxs(e.Fragment,{children:["amounts"in o&&o.amounts&&e.jsxs(s,{children:[e.jsx(n,{children:"Amounts"}),e.jsx(i,{children:o.amounts.join(", ")})]}),"tokenIds"in o&&o.tokenIds&&e.jsxs(s,{children:[e.jsx(n,{children:"Token IDs"}),e.jsx(i,{children:o.tokenIds.join(", ")})]})]}),t==="approve"&&o.spender&&e.jsxs(s,{children:[e.jsx(n,{children:"Spender"}),e.jsx(i,{children:e.jsx(c,{address:o.spender,url:(I=(w=l==null?void 0:l.blockExplorers)==null?void 0:w.default)==null?void 0:I.url,showCopyIcon:!1})})]}),(t==="transferFrom"||t==="safeTransferFrom"||t==="safeBatchTransferFrom")&&o.transferFrom&&e.jsxs(s,{children:[e.jsx(n,{children:"Transferring from"}),e.jsx(i,{children:e.jsx(c,{address:o.transferFrom,url:(b=(A=l==null?void 0:l.blockExplorers)==null?void 0:A.default)==null?void 0:b.url,showCopyIcon:!1})})]}),(t==="transferFrom"||t==="safeTransferFrom"||t==="safeBatchTransferFrom")&&o.transferTo&&e.jsxs(s,{children:[e.jsx(n,{children:"Transferring to"}),e.jsx(i,{children:e.jsx(c,{address:o.transferTo,url:(g=(x=l==null?void 0:l.blockExplorers)==null?void 0:x.default)==null?void 0:g.url,showCopyIcon:!1})})]})]})})},or=({variant:a,setPreventMaliciousTransaction:l,colorScheme:o="light",preventMaliciousTransaction:m})=>a==="warn"?e.jsx(oe,{children:e.jsxs(Ye,{theme:o,children:[e.jsx("span",{style:{fontWeight:"500"},children:"Warning: Suspicious transaction"}),e.jsx("br",{}),"This has been flagged as a potentially deceptive request. Approving could put your assets or funds at risk."]})}):a==="error"?e.jsx(e.Fragment,{children:e.jsxs(oe,{children:[e.jsx(Ke,{theme:o,children:e.jsxs("div",{children:[e.jsx("strong",{children:"This is a malicious transaction"}),e.jsx("br",{}),"This transaction transfers tokens to a known malicious address. Proceeding may result in the loss of valuable assets."]})}),e.jsxs(lr,{children:[e.jsx(_e,{color:"var(--privy-color-error)",checked:!m,readOnly:!0,onClick:()=>l(!m)}),e.jsx("span",{children:"I understand and want to proceed anyways."})]})]})}):null;let oe=h.div`
  margin-top: 1.5rem;
`,lr=h.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;const ar=({transactionIndex:a,maxIndex:l})=>typeof a!="number"||l===0?"":` (${a+1} / ${l+1})`,Vr=({img:a,submitError:l,prepareError:o,onClose:m,action:E,title:p,subtitle:t,to:k,tokenAddress:y,network:w,missingFunds:I,fee:A,from:b,cta:x,disabled:g,chain:d,isSubmitting:T,isPreparing:u,isTokenPriceLoading:C,isTokenContractInfoLoading:N,isSponsored:S,symbol:H,balance:R,onClick:L,transactionDetails:F,transactionIndex:B,maxIndex:W,onBack:r,chainName:v,validation:U,hasScanDetails:G,setIsScanDetailsOpen:Ie,preventMaliciousTransaction:Ae,setPreventMaliciousTransaction:Ce,tokensSent:K,tokensReceived:q,isScanning:Fe,isCancellable:Me,functionName:Ee})=>{var Y,X,P,$,ee,re;let{showTransactionDetails:Q,setShowTransactionDetails:Oe,hasMoreDetails:Ne,isErc20Ish:Le}=(j=>{let[D,Re]=f.useState(!1),Z=!0,se=!1;return(!j||j.isErc20Ish||j.action==="transaction")&&(Z=!1),Z&&(se=Object.entries(j||{}).some(([Be,Ve])=>Ve&&!["action","isErc20Ish","isNFTIsh"].includes(Be))),{showTransactionDetails:D,setShowTransactionDetails:Re,hasMoreDetails:Z&&se,isErc20Ish:j==null?void 0:j.isErc20Ish}})(F),Se=xe(),De=Le&&N||u||C||Fe;return e.jsxs(e.Fragment,{children:[e.jsx(J,{onClose:m,backFn:r}),a&&e.jsx(we,{children:a}),e.jsxs(ue,{style:{marginTop:a?"1.5rem":0},children:[p,e.jsx(ar,{maxIndex:W,transactionIndex:B})]}),e.jsx(me,{children:t}),e.jsxs(z,{style:{marginTop:"2rem"},children:[(!!K[0]||De)&&e.jsxs(s,{children:[q.length>0?e.jsx(n,{children:"Send"}):e.jsx(n,{children:E==="approve"?"Approval amount":"Amount"}),e.jsx("div",{className:"flex flex-col",children:K.map((j,D)=>e.jsx(ie,{iconUrl:j.iconUrl,value:Ee==="setApprovalForAll"?"All":j.value,usdValue:j.usdValue,symbol:j.symbol,nftName:j.nftName,nftCount:j.nftCount,decimals:j.decimals},D))})]}),q.length>0&&e.jsxs(s,{children:[e.jsx(n,{children:"Receive"}),e.jsx("div",{className:"flex flex-col",children:q.map((j,D)=>e.jsx(ie,{iconUrl:j.iconUrl,value:j.value,usdValue:j.usdValue,symbol:j.symbol,nftName:j.nftName,nftCount:j.nftCount,decimals:j.decimals},D))})]}),F&&"spender"in F&&(F!=null&&F.spender)?e.jsxs(s,{children:[e.jsx(n,{children:"Spender"}),e.jsx(i,{children:e.jsx(c,{address:F.spender,url:(X=(Y=d==null?void 0:d.blockExplorers)==null?void 0:Y.default)==null?void 0:X.url})})]}):null,k&&e.jsxs(s,{children:[e.jsx(n,{children:"To"}),e.jsx(i,{children:e.jsx(c,{address:k,url:($=(P=d==null?void 0:d.blockExplorers)==null?void 0:P.default)==null?void 0:$.url,showCopyIcon:!0})})]}),y&&e.jsxs(s,{children:[e.jsx(n,{children:"Token address"}),e.jsx(i,{children:e.jsx(c,{address:y,url:(re=(ee=d==null?void 0:d.blockExplorers)==null?void 0:ee.default)==null?void 0:re.url})})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Network"}),e.jsx(i,{children:w})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Estimated fee"}),e.jsx(i,{$isLoading:u||C||S===void 0,children:S?e.jsxs(be,{children:[e.jsxs(Te,{children:["Sponsored by ",Se.name]}),e.jsx(fe,{height:16,width:16})]}):A})]}),Ne&&!G&&e.jsxs(e.Fragment,{children:[e.jsx(s,{className:"cursor-pointer",onClick:()=>Oe(!Q),children:e.jsxs(Qe,{className:"flex items-center gap-x-1",children:["Details"," ",e.jsx(ge,{style:{width:"0.75rem",marginLeft:"0.25rem",transform:Q?"rotate(180deg)":void 0}})]})}),Q&&F&&e.jsx(tr,{action:E,chain:d,transactionDetails:F,isTokenContractInfoLoading:N,symbol:H})]}),G&&e.jsx(s,{children:e.jsxs(ke,{onClick:()=>Ie(!0),children:[e.jsx("span",{className:"text-color-primary",children:"Details"}),e.jsx($e,{height:"14px",width:"14px",strokeWidth:"2"})]})})]}),e.jsx(he,{}),l?e.jsx(V,{style:{marginTop:"2rem"},children:l.message}):o&&B===0?e.jsx(V,{style:{marginTop:"2rem"},children:o.shortMessage??ve}):null,e.jsx(or,{variant:U,preventMaliciousTransaction:Ae,setPreventMaliciousTransaction:Ce}),e.jsx(ye,{$useSmallMargins:!(!o&&!l&&U!=="warn"&&U!=="error"),address:b,balance:R,errMsg:u||o||l||!I?void 0:`Add funds on ${(d==null?void 0:d.name)??v} to complete transaction.`}),e.jsx(_,{style:{marginTop:"1rem"},loading:T,disabled:g||u,onClick:L,children:x}),Me&&e.jsx(qe,{style:{marginTop:"1rem"},onClick:m,isSubmitting:!1,children:"Not now"}),e.jsx(je,{})]})},zr=({img:a,title:l,subtitle:o,cta:m,instructions:E,network:p,blockExplorerUrl:t,isMissingFunds:k,submitError:y,parseError:w,total:I,swap:A,transactingWalletAddress:b,fee:x,balance:g,disabled:d,isSubmitting:T,isPreparing:u,isTokenPriceLoading:C,onClick:N,onClose:S,onBack:H,isSponsored:R})=>{let L=u||C,[F,B]=f.useState(!1),W=xe();return e.jsxs(e.Fragment,{children:[e.jsx(J,{onClose:S,backFn:H}),a&&e.jsx(we,{children:a}),e.jsx(ue,{style:{marginTop:a?"1.5rem":0},children:l}),e.jsx(me,{children:o}),e.jsxs(z,{style:{marginTop:"2rem",marginBottom:".5rem"},children:[(I||L)&&e.jsxs(s,{children:[e.jsx(n,{children:"Amount"}),e.jsx(i,{$isLoading:L,children:I})]}),A&&e.jsxs(s,{children:[e.jsx(n,{children:"Swap"}),e.jsx(i,{children:A})]}),p&&e.jsxs(s,{children:[e.jsx(n,{children:"Network"}),e.jsx(i,{children:p})]}),(x||L||R!==void 0)&&e.jsxs(s,{children:[e.jsx(n,{children:"Estimated fee"}),e.jsx(i,{$isLoading:L,children:R&&!L?e.jsxs(be,{children:[e.jsxs(Te,{children:["Sponsored by ",W.name]}),e.jsx(fe,{height:16,width:16})]}):x})]})]}),e.jsx(s,{children:e.jsxs(ke,{onClick:()=>B(r=>!r),children:[e.jsx("span",{children:"Advanced"}),e.jsx(ge,{height:"16px",width:"16px",strokeWidth:"2",style:{transition:"all 300ms",transform:F?"rotate(180deg)":void 0}})]})}),F&&e.jsx(e.Fragment,{children:E.map((r,v)=>r.type==="sol-transfer"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsxs(O,{children:["Transfer ",r.withSeed?"with seed":""]})}),e.jsxs(s,{children:[e.jsx(n,{children:"Amount"}),e.jsxs(i,{children:[ne({amount:r.value,decimals:r.token.decimals})," ",r.token.symbol]})]}),!!r.toAccount&&e.jsxs(s,{children:[e.jsx(n,{children:"Destination"}),e.jsx(i,{children:e.jsx(c,{address:r.toAccount,url:t})})]})]},v):r.type==="spl-transfer"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsxs(O,{children:["Transfer ",r.token.symbol]})}),e.jsxs(s,{children:[e.jsx(n,{children:"Amount"}),e.jsx(i,{children:r.value.toString()})]}),!!r.fromAta&&e.jsxs(s,{children:[e.jsx(n,{children:"Source"}),e.jsx(i,{children:e.jsx(c,{address:r.fromAta,url:t})})]}),!!r.toAta&&e.jsxs(s,{children:[e.jsx(n,{children:"Destination"}),e.jsx(i,{children:e.jsx(c,{address:r.toAta,url:t})})]}),!!r.token.address&&e.jsxs(s,{children:[e.jsx(n,{children:"Token"}),e.jsx(i,{children:e.jsx(c,{address:r.token.address,url:t})})]})]},v):r.type==="ata-creation"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsx(O,{children:"Create token account"})}),e.jsxs(s,{children:[e.jsx(n,{children:"Program ID"}),e.jsx(i,{children:e.jsx(c,{address:r.program,url:t})})]}),!!r.owner&&e.jsxs(s,{children:[e.jsx(n,{children:"Owner"}),e.jsx(i,{children:e.jsx(c,{address:r.owner,url:t})})]})]},v):r.type==="create-account"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsxs(O,{children:["Create account ",r.withSeed?"with seed":""]})}),!!r.account&&e.jsxs(s,{children:[e.jsx(n,{children:"Account"}),e.jsx(i,{children:e.jsx(c,{address:r.account,url:t})})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Amount"}),e.jsxs(i,{children:[ne({amount:r.value,decimals:9})," SOL"]})]})]},v):r.type==="spl-init-account"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsx(O,{children:"Initialize token account"})}),!!r.account&&e.jsxs(s,{children:[e.jsx(n,{children:"Account"}),e.jsx(i,{children:e.jsx(c,{address:r.account,url:t})})]}),!!r.mint&&e.jsxs(s,{children:[e.jsx(n,{children:"Mint"}),e.jsx(i,{children:e.jsx(c,{address:r.mint,url:t})})]}),!!r.owner&&e.jsxs(s,{children:[e.jsx(n,{children:"Owner"}),e.jsx(i,{children:e.jsx(c,{address:r.owner,url:t})})]})]},v):r.type==="spl-close-account"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsx(O,{children:"Close token account"})}),!!r.source&&e.jsxs(s,{children:[e.jsx(n,{children:"Source"}),e.jsx(i,{children:e.jsx(c,{address:r.source,url:t})})]}),!!r.destination&&e.jsxs(s,{children:[e.jsx(n,{children:"Destination"}),e.jsx(i,{children:e.jsx(c,{address:r.destination,url:t})})]}),!!r.owner&&e.jsxs(s,{children:[e.jsx(n,{children:"Owner"}),e.jsx(i,{children:e.jsx(c,{address:r.owner,url:t})})]})]},v):r.type==="spl-sync-native"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsx(O,{children:"Sync native"})}),e.jsxs(s,{children:[e.jsx(n,{children:"Program ID"}),e.jsx(i,{children:e.jsx(c,{address:r.program,url:t})})]})]},v):r.type==="raydium-swap-base-input"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsxs(O,{children:["Raydium swap"," ",r.tokenIn&&r.tokenOut?`${r.tokenIn.symbol} → ${r.tokenOut.symbol}`:""]})}),e.jsxs(s,{children:[e.jsx(n,{children:"Amount in"}),e.jsx(i,{children:r.amountIn.toString()})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Minimum amount out"}),e.jsx(i,{children:r.minimumAmountOut.toString()})]}),r.mintIn&&e.jsxs(s,{children:[e.jsx(n,{children:"Token in"}),e.jsx(i,{children:e.jsx(c,{address:r.mintIn,url:t})})]}),r.mintOut&&e.jsxs(s,{children:[e.jsx(n,{children:"Token out"}),e.jsx(i,{children:e.jsx(c,{address:r.mintOut,url:t})})]})]},v):r.type==="raydium-swap-base-output"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsxs(O,{children:["Raydium swap"," ",r.tokenIn&&r.tokenOut?`${r.tokenIn.symbol} → ${r.tokenOut.symbol}`:""]})}),e.jsxs(s,{children:[e.jsx(n,{children:"Max amount in"}),e.jsx(i,{children:r.maxAmountIn.toString()})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Amount out"}),e.jsx(i,{children:r.amountOut.toString()})]}),r.mintIn&&e.jsxs(s,{children:[e.jsx(n,{children:"Token in"}),e.jsx(i,{children:e.jsx(c,{address:r.mintIn,url:t})})]}),r.mintOut&&e.jsxs(s,{children:[e.jsx(n,{children:"Token out"}),e.jsx(i,{children:e.jsx(c,{address:r.mintOut,url:t})})]})]},v):r.type==="jupiter-swap-shared-accounts-route"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsxs(O,{children:["Jupiter swap"," ",r.tokenIn&&r.tokenOut?`${r.tokenIn.symbol} → ${r.tokenOut.symbol}`:""]})}),e.jsxs(s,{children:[e.jsx(n,{children:"In amount"}),e.jsx(i,{children:r.inAmount.toString()})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Quoted out amount"}),e.jsx(i,{children:r.quotedOutAmount.toString()})]}),r.mintIn&&e.jsxs(s,{children:[e.jsx(n,{children:"Token in"}),e.jsx(i,{children:e.jsx(c,{address:r.mintIn,url:t})})]}),r.mintOut&&e.jsxs(s,{children:[e.jsx(n,{children:"Token out"}),e.jsx(i,{children:e.jsx(c,{address:r.mintOut,url:t})})]})]},v):r.type==="jupiter-swap-exact-out-route"?e.jsxs(M,{children:[e.jsx(s,{children:e.jsxs(O,{children:["Jupiter swap"," ",r.tokenIn&&r.tokenOut?`${r.tokenIn.symbol} → ${r.tokenOut.symbol}`:""]})}),e.jsxs(s,{children:[e.jsx(n,{children:"Quoted in amount"}),e.jsx(i,{children:r.quotedInAmount.toString()})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Amount out"}),e.jsx(i,{children:r.outAmount.toString()})]}),r.mintIn&&e.jsxs(s,{children:[e.jsx(n,{children:"Token in"}),e.jsx(i,{children:e.jsx(c,{address:r.mintIn,url:t})})]}),r.mintOut&&e.jsxs(s,{children:[e.jsx(n,{children:"Token out"}),e.jsx(i,{children:e.jsx(c,{address:r.mintOut,url:t})})]})]},v):e.jsxs(M,{children:[e.jsxs(s,{children:[e.jsx(n,{children:"Program ID"}),e.jsx(i,{children:e.jsx(c,{address:r.program,url:t})})]}),e.jsxs(s,{children:[e.jsx(n,{children:"Data"}),e.jsx(i,{children:r.discriminator})]})]},v))}),e.jsx(he,{}),y?e.jsx(V,{style:{marginTop:"2rem"},children:y.message}):w?e.jsx(V,{style:{marginTop:"2rem"},children:ve}):null,e.jsx(ye,{$useSmallMargins:!(!w&&!y),title:"",address:b,balance:g,errMsg:u||w||y||!k?void 0:"Add funds on Solana to complete transaction."}),e.jsx(_,{style:{marginTop:"1rem"},loading:T,disabled:d||u,onClick:N,children:m}),e.jsx(je,{})]})};let ye=h(Ze)`
  ${a=>a.$useSmallMargins?"margin-top: 0.5rem;":"margin-top: 2rem;"}
`,M=h(z)`
  margin-top: 0.5rem;
  border: 1px solid var(--privy-color-foreground-4);
  border-radius: var(--privy-border-radius-sm);
  padding: 0.5rem;
`,ve="There was an error preparing your transaction. Your transaction request will likely fail.",we=h.div`
  display: flex;
  width: 100%;
  justify-content: center;
  max-height: 40px;

  > img {
    object-fit: contain;
    border-radius: var(--privy-border-radius-sm);
  }
`,be=h.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
`,Te=h.span`
  font-size: 14px;
  font-weight: 500;
  color: var(--privy-color-foreground);
`,le=a=>(a==null?void 0:a.code)===He.COMPLIANCE_BLOCKED,dr=()=>e.jsxs(jr,{children:[e.jsx(ur,{}),e.jsx(mr,{})]});const Hr=({transactionError:a,chainId:l,onClose:o,onRetry:m,chainType:E,transactionHash:p})=>{let{chains:t}=ze(),[k,y]=f.useState(!1),{errorCode:w,errorMessage:I}=((x,g)=>{if(g==="ethereum")return le(x)?{errorCode:"Transaction blocked",errorMessage:x.message}:{errorCode:x.details??x.message,errorMessage:x.shortMessage};let d=x.txSignature,T=(x==null?void 0:x.transactionMessage)||"Something went wrong.";if(Array.isArray(x.logs)){let u=x.logs.find(C=>/insufficient (lamports|funds)/gi.test(C));u&&(T=u)}return{transactionHash:d,errorMessage:T}})(a,E),A=le(a),b=(({chains:x,chainId:g,chainType:d,transactionHash:T})=>{var u,C;return d==="ethereum"?((C=(u=x.find(N=>N.id===g))==null?void 0:u.blockExplorers)==null?void 0:C.default.url)??"https://etherscan.io":function(N,S){return`https://explorer.solana.com/tx/${N}?chain=${S}`}(T||"",g)})({chains:t,chainId:l,chainType:E,transactionHash:p});return e.jsxs(e.Fragment,{children:[e.jsx(J,{onClose:o}),e.jsxs(cr,{children:[e.jsx(dr,{}),e.jsx(xr,{children:w}),e.jsx(hr,{children:A?"This transaction cannot be completed.":"Please try again."}),e.jsxs(de,{children:[e.jsx(ae,{children:"Error message"}),e.jsx(ce,{$clickable:!1,children:I})]}),p&&e.jsxs(de,{children:[e.jsx(ae,{children:"Transaction hash"}),e.jsxs(gr,{children:["Copy this hash to view details about the transaction on a"," ",e.jsx("u",{children:e.jsx("a",{href:b,children:"block explorer"})}),"."]}),e.jsxs(ce,{$clickable:!0,onClick:async()=>{await navigator.clipboard.writeText(p),y(!0)},children:[p,e.jsx(yr,{clicked:k})]})]}),!A&&e.jsx(pr,{onClick:()=>m({resetNonce:!!p}),children:"Retry transaction"})]}),e.jsx(Ue,{})]})};let cr=h.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`,xr=h.span`
  color: var(--privy-color-foreground);
  text-align: center;
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 1.25rem; /* 111.111% */
  text-align: center;
  margin: 10px;
`,hr=h.span`
  margin-top: 4px;
  margin-bottom: 10px;
  color: var(--privy-color-foreground-3);
  text-align: center;

  font-size: 0.875rem;
  font-style: normal;
  font-weight: 400;
  line-height: 20px; /* 142.857% */
  letter-spacing: -0.008px;
`,jr=h.div`
  position: relative;
  width: 60px;
  height: 60px;
  margin: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
`,mr=h(Xe)`
  position: absolute;
  width: 35px;
  height: 35px;
  color: var(--privy-color-error);
`,ur=h.div`
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: var(--privy-color-error);
  opacity: 0.1;
`,pr=h(_)`
  && {
    margin-top: 24px;
  }
  transition:
    color 350ms ease,
    background-color 350ms ease;
`,ae=h.span`
  width: 100%;
  text-align: left;
  font-size: 0.825rem;
  color: var(--privy-color-foreground);
  padding: 4px;
`,de=h.div`
  width: 100%;
  margin: 5px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`,gr=h.text`
  position: relative;
  width: 100%;
  padding: 5px;
  font-size: 0.8rem;
  color: var(--privy-color-foreground-3);
  text-align: left;
  word-wrap: break-word;
`,ce=h.span`
  position: relative;
  width: 100%;
  background-color: var(--privy-color-background-2);
  padding: 8px 12px;
  border-radius: 10px;
  margin-top: 5px;
  font-size: 14px;
  color: var(--privy-color-foreground-3);
  text-align: left;
  word-wrap: break-word;
  ${a=>a.$clickable&&`cursor: pointer;
  transition: background-color 0.3s;
  padding-right: 45px;

  &:hover {
    background-color: var(--privy-color-foreground-4);
  }`}
`,fr=h(sr)`
  position: absolute;
  top: 13px;
  right: 13px;
  width: 24px;
  height: 24px;
`,kr=h(Ge)`
  position: absolute;
  top: 13px;
  right: 13px;
  width: 24px;
  height: 24px;
`,yr=({clicked:a})=>e.jsx(a?kr:fr,{});export{Vr as G,zr as K,Hr as o};
