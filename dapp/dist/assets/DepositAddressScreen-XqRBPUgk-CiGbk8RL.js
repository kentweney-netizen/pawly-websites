import{gz as de,gA as X,gB as ue,gC as O,gD as Q,gE as me,d8 as v,da as m,d5 as pe,d7 as t,dB as fe,dA as p,gF as he,dj as ge}from"./index-CXlKrUqI.js";import{i as S,d as Y,t as K,l as G,y as Z,c as L,n as ye,a as J,s as be,Q as ee,m as Ce,g as j,p as N,f as U,v as M,u as A,h as D,b as I}from"./styles-DgsHCTKB-Dm0Xc4eE.js";import{n as w}from"./ScreenLayout-Yoa2TSpi-DcWpKHqg.js";import{n as re}from"./styles-DVyDvTdj-i8xHGRmM.js";import{m as xe}from"./ModalHeader-CAqKnddp-DW_wjXlK.js";import{C as Ee}from"./QrCode-BV7KfzAf-CQi1A9b8.js";import{u as ve,a as _e,s as we,b as Te,c as ke,d as Se,e as je,f as Ne,g as Ue,F as Ae}from"./floating-ui.react-BrH0enkl.js";import{m as De}from"./CopyableText-ChtfBWx4-UcFLU4sA.js";import{T as F}from"./triangle-alert-CzIyxf0q.js";import{c as te}from"./createLucideIcon-Cc9YfBd0.js";import{r as se,C as Ie}from"./chevron-down-CS73oApA.js";import{C as $}from"./check-B_wgVyfz.js";import{H as Re}from"./hourglass-B0TIQEec.js";import{I as Oe}from"./info-BiyQ7Yjz.js";import{n as Fe,o as $e,p as Pe,s as Le}from"./floating-ui.react-dom-CMgik7GR.js";import"./Screen-CLdp3cO6-BpR48GZK.js";import"./index-Dq_xe9dz-CXiEWXll.js";import"./copy-NOK6Zkfw.js";function B(e){return e.startsWith("eip155:")?"ethereum":e.startsWith("solana:")?"solana":e.startsWith("bip122:")?"bitcoin-segwit":e.startsWith("tron:")?"tron":void 0}async function ne(e){var a;let{user:r}=await e.privy.user.get();if(!r)return{ok:!1,error:"NOT_AUTHENTICATED"};let s=function(l,c){let d=B(l);if(!d)return;let o=c.linked_accounts.find(i=>i.type==="wallet"&&i.chain_type===d&&"address"in i&&i.address);return o&&"address"in o?o.address:void 0}(e.caip2,r);if(s)return{ok:!0,address:s};let n=B(e.caip2);if(!n)return{ok:!1,error:"UNSUPPORTED_CHAIN"};try{let l=await e.privy.fetchPrivyRoute(de,{body:{chain_type:n}});return await((a=e.onWalletCreated)==null?void 0:a.call(e)),{ok:!0,address:l.address}}catch{return{ok:!1,error:"REFUND_WALLET_CREATION_FAILED"}}}async function Me(e){let{user:r}=await e.privy.user.get();if(!r)throw Error("NOT_AUTHENTICATED");let s=e.refundAddress;if(!s){let n=await ne({privy:e.privy,caip2:e.sourceChain,onWalletCreated:e.onWalletCreated});if(!n.ok)throw Error(n.error);s=n.address}return await e.privy.fetchPrivyRoute(X,{body:{source_chain:e.sourceChain,source_currency:e.sourceCurrency,destination_chain:e.destinationChain,destination_currency:e.destinationCurrency,destination_address:e.destinationAddress,refund_address:s,...e.slippageBps!=null?{slippage_bps:e.slippageBps}:{}}})}function oe(e,r){return Math.ceil(r/e)}function ae(e){return e.status==="success"?e.result?{status:"success",order:e.result}:{status:"timeout"}:e.status==="aborted"?{status:"aborted",error:e.error}:{status:"timeout",error:e.error}}async function Be(e){return await e.privy.fetchPrivyRoute(O,{params:{order_id:e.orderId}})}async function We(e){let r=e.pollIntervalMs??2e3,s=e.timeoutMs??18e5,n=e.signal??new AbortController().signal;return ae(await se({operation:async()=>{let a=await e.privy.fetchPrivyRoute(ue,{params:{deposit_address_id:e.depositAddressId},query:{after:e.quoteCreatedAt}});if(a.order)return await e.privy.fetchPrivyRoute(O,{params:{order_id:a.order.id}})},until:a=>a!==void 0,delay:r,interval:r,attempts:oe(r,s),signal:n}))}async function Ve(e){let r=e.pollIntervalMs??2e3,s=e.timeoutMs??18e5,n=e.signal??new AbortController().signal;return ae(await se({operation:()=>e.privy.fetchPrivyRoute(O,{params:{order_id:e.orderId}}),until:a=>a.status!=="executing",delay:r,interval:r,attempts:oe(r,s),signal:n}))}async function ze(e){let r=await e.fetchPrivyRoute(Q,{});return{currencies:r.currencies,chains:r.chains}}var P=Object.freeze({__proto__:null,generateDepositAddress:Me,getConfig:ze,getDeposit:Be,resolveRefundAddress:ne,waitForCompletion:Ve,waitForDeposit:We});const _=me(()=>null),k=e=>{_.getState()!==null&&_.setState(e)};async function qe(e,r){let s=await e.fetchPrivyRoute(Q,{}),n={config:{status:"ready",data:{currencies:s.currencies,chains:s.chains}}};r!=null&&r.aborted||k(n)}function g(){let e=_(),{closePrivyModal:r,privy:s}=v(),n=(e==null?void 0:e.params)??null,a=(e==null?void 0:e.config)??{status:"loading"},l=m.useCallback(o=>{k({modalState:o})},[]),c=m.useCallback(async()=>{let o=e==null?void 0:e.controller;if(n&&o&&!o.signal.aborted){k({config:{status:"loading"}});try{await qe(s,o.signal)}catch(i){if(o.signal.aborted)return;throw k({config:{status:"error",error:i instanceof Error?i:Error("Failed to load deposit config")}}),i}}},[n,s,e==null?void 0:e.controller]),d=m.useCallback(()=>{if(!e)return;let{modalState:o}=e;o.step==="complete"?e.onComplete():o.step==="failed"?e.onError(Error("DEPOSIT_FAILED")):o.step==="error"?e.onError(Error(o.code)):o.step==="refunded"?e.onError(Error("DEPOSIT_REFUNDED")):e.onError(Error("USER_EXITED")),r({shouldCallAuthOnSuccess:!1})},[e,r]);return{modalState:(e==null?void 0:e.modalState)??{step:"intro"},setModalState:l,config:a,retryConfig:c,params:n,close:d,onBack:e==null?void 0:e.onBack}}function E(e){let{modalState:r,config:s,params:n,...a}=g();if(function(l,c){if(l.step!==c)throw Error("UNEXPECTED_STATE")}(r,e),!n||s.status!=="ready")throw Error("UNEXPECTED_STATE");return{state:r,configData:s.data,params:n,...a}}/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const He=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],Xe=te("chevron-up",He);/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qe=[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]],Ye=te("undo-2",Qe);class Ke extends m.Component{static getDerivedStateFromError(){return{hasError:!0}}componentDidCatch(r,s){this.props.onError(r)}componentDidUpdate(r){r.resetKey!==this.props.resetKey&&this.state.hasError&&this.setState({hasError:!1})}render(){return this.state.hasError?null:this.props.children}constructor(...r){super(...r),this.state={hasError:!1}}}function Ge(e,r,s){let n=Number(e);return!Number.isFinite(n)||n===0?`1 ${r} ≈ ${e} ${s}`:n>=.01?`1 ${r} ≈ ${W(n)} ${s}`:`${W(1/n)} ${r} ≈ 1 ${s}`}function W(e){return e>=1e3?new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.round(e)):e>=100?new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(e):e>=1?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(e):new Intl.NumberFormat("en-US",{maximumFractionDigits:4}).format(e)}function V(e,r){let s=Number(e);if(!Number.isFinite(s)||s===0)return e;let n=r!=null?s/10**r:s;return n>=1e3?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n):n>=1?new Intl.NumberFormat("en-US",{maximumFractionDigits:4}).format(n):n>=1e-4?new Intl.NumberFormat("en-US",{maximumFractionDigits:6}).format(n):new Intl.NumberFormat("en-US",{maximumSignificantDigits:4}).format(n)}function R({address:e,caip2:r,config:s}){for(let n of s.currencies){let a=n.chains.find(l=>l.caip2===r&&l.address.toLowerCase()===e.toLowerCase());if(a)return{symbol:n.symbol.toUpperCase(),decimals:a.decimals}}return{symbol:e,decimals:void 0}}function z(e,r){var s;return((s=r[e])==null?void 0:s.displayName)??e}function q(e,r){if(!e.chains[r.destinationChain])return`Unsupported destination chain: "${r.destinationChain}". Check that the chain is in CAIP-2 format (e.g. "eip155:8453") and is supported for deposit addresses.`;let s=r.destinationCurrency.toLowerCase();return e.currencies.some(n=>n.chains.some(a=>a.caip2===r.destinationChain&&a.address.toLowerCase()===s))?null:`Unsupported destination currency "${r.destinationCurrency}" on chain "${r.destinationChain}". Check that this token address is supported on the specified chain.`}let Ze=new Set(["ROUTE_UNAVAILABLE","UNEXPECTED_STATE","TIMEOUT_WAITING_FOR_NEXT_ORDER","TIMEOUT_ORDER_COMPLETION","DEPOSIT_FAILED","DEPOSIT_REFUNDED","USER_EXITED","AMOUNT_TOO_LOW","INSUFFICIENT_LIQUIDITY","UNSUPPORTED_CHAIN","UNSUPPORTED_CURRENCY","UNSUPPORTED_ROUTE","NO_SWAP_ROUTES_FOUND","NO_INTERNAL_SWAP_ROUTES_FOUND","NO_QUOTES","SANCTIONED_WALLET_ADDRESS","REFUND_WALLET_CREATION_FAILED","DEPOSIT_ADDRESSES_NOT_ENABLED","NOT_AUTHENTICATED"]);function Je(e){return Ze.has(e)}function H(e){return Je(e)?e:"UNKNOWN_ERROR"}function ie(){let{params:e,setModalState:r}=g(),{privy:s}=v(),n=function(){let{privy:c,refreshSessionAndUser:d}=v();return m.useCallback((o,i)=>i?Promise.resolve({ok:!0,address:i}):P.resolveRefundAddress({privy:c,caip2:o,onWalletCreated:d}),[c,d])}(),[a,l]=m.useState(!1);return{fetchQuote:m.useCallback(async(c,d,o)=>{if(e){l(!0);try{let i=await n(c.caip2,e.refundAddress);if(!i.ok)return void r({step:"error",code:H(i.error)});let u=await s.fetchPrivyRoute(X,{body:{source_chain:c.caip2,source_currency:c.currencyAddress,destination_chain:e.destinationChain,destination_currency:e.destinationCurrency,destination_address:e.destinationAddress,refund_address:i.address,...e.slippageBps!=null?{slippage_bps:e.slippageBps}:{}}});r({step:"address",selectedCurrency:d,selectedChain:c,availableChains:o,quote:u})}catch(i){let u=i instanceof Error?i:Error(String(i)),f="status"in u&&typeof u.status=="number"?u.status:void 0;r({step:"error",code:u instanceof he&&u.code==="feature_not_enabled"?"DEPOSIT_ADDRESSES_NOT_ENABLED":f&&f>=500?"UNKNOWN_ERROR":H(u.message),message:u.message})}finally{l(!1)}}},[e,s,n,r]),isFetching:a}}function le(e,r){switch(e.status){case"completed":return r({step:"complete",order:e});case"refunded":return r({step:"refunded",order:e});case"failed":return r({step:"failed",order:e});case"executing":return r({step:"processing",order:e});default:return}}const er=({sourceAmount:e,sourceSymbol:r,sourceChainName:s,sourceDecimals:n,destinationAmount:a,destSymbol:l,destChainName:c,destDecimals:d,onClose:o})=>t.jsx(S,{icon:$,iconVariant:"success",title:"Transfer complete",subtitle:a?`Received ${V(e,n)} ${r} on ${s} and converted it to ${V(a,d)} ${l} on ${c}. Funds are available to use.`:`Your ${r} has been received and is now available in your wallet.`,showClose:!0,onClose:o,primaryCta:{label:"Done",onClick:o},watermark:!1});function rr(){let{state:e,configData:r,close:s}=E("complete"),{order:n}=e,{sourceSymbol:a,sourceChainName:l,sourceDecimals:c,destSymbol:d,destChainName:o,destDecimals:i}=m.useMemo(()=>{let u=R({address:n.source_currency,caip2:n.source_chain,config:r}),f=R({address:n.destination_currency,caip2:n.destination_chain,config:r});return{sourceSymbol:u.symbol,sourceChainName:z(n.source_chain,r.chains),sourceDecimals:u.decimals,destSymbol:f.symbol,destChainName:z(n.destination_chain,r.chains),destDecimals:f.decimals}},[n,r]);return t.jsx(er,{sourceAmount:n.source_amount,sourceSymbol:a,sourceChainName:l,sourceDecimals:c,destinationAmount:n.destination_amount,destSymbol:d,destChainName:o,destDecimals:i,onClose:s})}function tr(){let{modalState:e,setModalState:r,config:s,retryConfig:n,close:a}=g();if(e.step!=="error")throw Error("UNEXPECTED_STATE");let{code:l}=e,{title:c,subtitle:d,detail:o,iconVariant:i}=(y=>{switch(y){case"AMOUNT_TOO_LOW":return{title:"Amount too low",subtitle:"The deposit amount is below the minimum for this route.",detail:"Try a larger amount or a different token.",iconVariant:"warning"};case"INSUFFICIENT_LIQUIDITY":return{title:"Insufficient liquidity",subtitle:"There isn't enough liquidity for this route right now.",detail:"Try a smaller amount or a different network.",iconVariant:"warning"};case"UNSUPPORTED_CHAIN":return{title:"Unsupported chain",subtitle:"Deposits from this chain type aren't supported yet. Try a different network.",iconVariant:"warning"};case"UNSUPPORTED_CURRENCY":case"UNSUPPORTED_ROUTE":case"ROUTE_UNAVAILABLE":case"NO_SWAP_ROUTES_FOUND":case"NO_INTERNAL_SWAP_ROUTES_FOUND":case"NO_QUOTES":return{title:"Route not available",subtitle:"This deposit route isn't supported right now. Try a different token or network.",iconVariant:"warning"};case"SANCTIONED_WALLET_ADDRESS":return{title:"Address restricted",subtitle:"This address cannot be used for deposits due to compliance restrictions.",iconVariant:"warning"};case"REFUND_WALLET_CREATION_FAILED":return{title:"Unable to set up refund address",subtitle:"We couldn't create a wallet to receive refunds on this chain. Please try again or select a different network.",iconVariant:"warning"};case"DEPOSIT_ADDRESSES_NOT_ENABLED":return{title:"Not enabled",subtitle:"Deposit addresses are not enabled for this app.",iconVariant:"warning"};case"NOT_AUTHENTICATED":return{title:"Not signed in",subtitle:"Please sign in to continue with your deposit.",iconVariant:"warning"};case"TIMEOUT_WAITING_FOR_NEXT_ORDER":case"TIMEOUT_ORDER_COMPLETION":return{title:"Taking longer than expected",subtitle:"Your funds are safe. The deposit is still being processed — check back later.",iconVariant:"subtle"};default:return{title:"Something went wrong",subtitle:"We couldn't complete your request. Please try again.",iconVariant:"subtle"}}})(l),[u,f]=m.useState(!1);return t.jsx(S,{icon:F,iconVariant:i,title:c,subtitle:o?`${d} ${o}`:d,showClose:!0,onClose:a,primaryCta:{label:"Try again",onClick:async()=>{if(s.status!=="ready"){f(!0);try{await n(),r({step:"token"})}catch{f(!1)}}else r({step:"token"})},loading:u},watermark:!0})}function sr(){let{state:e,close:r}=E("failed"),{order:s}=e;return t.jsx(w,{icon:F,iconVariant:"error",title:"Transfer failed",subtitle:"Something went wrong processing your transfer.",showClose:!0,onClose:r,primaryCta:{label:"Done",onClick:r},secondaryCta:{label:"Learn about manual recovery",onClick:()=>window.open("https://docs.privy.io","_blank","noopener,noreferrer")},watermark:!0,children:t.jsxs(nr,{href:s.tracking_url,target:"_blank",rel:"noopener noreferrer",children:["Reference: ",s.provider_request_id]})})}let nr=p.a`
  text-align: center;
  font-size: 0.75rem;
  opacity: 0.7;
  text-decoration: underline;
  cursor: pointer;
  color: var(--privy-color-foreground-3);
`;function or(){let{close:e,setModalState:r,config:s,params:n,onBack:a}=g(),[l,c]=m.useState(!1);return m.useEffect(()=>{if(l&&n){if(s.status==="ready"){let d=q(s.data,n);r(d?{step:"error",code:"ROUTE_UNAVAILABLE",message:d}:{step:"token"})}s.status==="error"&&r({step:"error",code:"ROUTE_UNAVAILABLE"})}},[l,s,n,r]),t.jsx(S,{icon:ee,iconVariant:"subtle",title:"Add funds",subtitle:"Top up your account by sending crypto from any wallet. Conversion and routing handled by Relay.",showClose:!0,onClose:e,showBack:!!a,onBack:a,primaryCta:{label:"Continue",onClick:()=>{if(s.status==="ready"&&n){let d=q(s.data,n);r(d?{step:"error",code:"ROUTE_UNAVAILABLE",message:d}:{step:"token"})}else s.status==="error"?r({step:"error",code:"ROUTE_UNAVAILABLE"}):c(!0)},loading:l&&s.status==="loading",loadingText:null},watermark:!0})}function ar(){let{state:e,setModalState:r,close:s}=E("network"),[n,a]=m.useState(-1),{availableChains:l}=e,{confirm:c,isFetching:d}=function(){let o=_(),{params:i}=g(),{fetchQuote:u,isFetching:f}=ie();return{confirm:m.useCallback(async y=>{if(!y||!i)return;let h=o==null?void 0:o.modalState;h&&h.step==="network"&&await u(y,h.selectedCurrency,h.availableChains)},[i,o,u]),isFetching:f}}();return t.jsx(w,{title:"Select network",eyebrow:t.jsxs("span",{style:{display:"flex",alignItems:"center",gap:"0.375rem"},children:[t.jsx("img",{src:e.selectedCurrency.logoURI,alt:"",style:{width:"1rem",height:"1rem",borderRadius:"50%"}}),"Send ",e.selectedCurrency.symbol]}),showBack:!0,onBack:()=>r({step:"token"}),showClose:!0,onClose:s,watermark:!0,children:t.jsx(re,{style:{marginTop:"1rem",height:"22rem"},$colorScheme:"light",children:l.map((o,i)=>t.jsxs(Y,{$selected:n===i,disabled:d,onClick:()=>{a(i),c(o)},children:[t.jsx(K,{src:o.iconUrl,alt:o.displayName}),t.jsx(G,{children:o.displayName}),d&&i===n&&t.jsx(Z,{})]},o.caip2))})})}const ir=({trackingUrl:e,onClose:r})=>t.jsx(w,{icon:Re,iconVariant:"subtle",title:"Transfer in progress",subtitle:"Your deposit was received and the transfer is now processing.",showClose:!0,onClose:r,secondaryCta:{label:"View on block explorer ↗",onClick:()=>window.open(e,"_blank","noopener,noreferrer")},watermark:!1,children:t.jsxs(Ce,{children:[t.jsxs(j,{children:[t.jsx(N,{$status:"done",children:t.jsx($,{size:14,color:"var(--privy-color-icon-success)",strokeWidth:2})}),t.jsx(U,{children:"Deposit received"})]}),t.jsx(M,{}),t.jsxs(j,{children:[t.jsx(N,{$status:"active",children:t.jsx(lr,{})}),t.jsx(U,{children:"Bridging"})]}),t.jsx(M,{}),t.jsxs(j,{children:[t.jsx(N,{$status:"pending"}),t.jsx(U,{children:"Funds arrived"})]})]})});let lr=p.span`
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--privy-color-foreground-3);
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;function cr(){let{state:e,close:r}=E("processing");return function({orderId:s,enabled:n}){let{privy:a}=v(),{setModalState:l}=g();m.useEffect(()=>{let c=new AbortController;return P.waitForCompletion({privy:a,orderId:s,signal:c.signal}).then(d=>{c.signal.aborted||(d.status==="success"?le(d.order,l):d.status==="timeout"&&l({step:"error",code:"TIMEOUT_ORDER_COMPLETION"}))}),()=>{c.abort()}},[n,s,a,l])}({orderId:e.order.id,enabled:!0}),t.jsx(ir,{trackingUrl:e.order.tracking_url,onClose:r})}function dr(){let{state:e,close:r}=E("refunded"),{order:s}=e;return t.jsx(S,{icon:Ye,iconVariant:"subtle",title:"Transfer refunded",subtitle:"Your transfer was received, but the swap couldn't be completed. A refund has been started automatically.",showClose:!0,onClose:r,primaryCta:{label:"Done",onClick:r},secondaryCta:{label:"View transaction details",onClick:()=>window.open(s.tracking_url,"_blank","noopener,noreferrer")},watermark:!0})}function ur(){let{close:e,setModalState:r,config:s}=g(),{confirm:n,currencies:a,isFetching:l}=function(){let{config:o,setModalState:i}=g(),{fetchQuote:u,isFetching:f}=ie(),y=o.status==="ready"?o.data.currencies:[];return{confirm:m.useCallback(async h=>{if(o.status!=="ready"||!h)return;let b=function(C,ce){return C.chains.map(x=>{let T=ce.chains[x.caip2];return T?{caip2:x.caip2,displayName:T.displayName,iconUrl:T.iconUrl,vmType:T.vmType,currencyAddress:x.address,currencyDecimals:x.decimals}:null}).filter(x=>x!==null)}(h,o.data);if(b.length!==1)i({step:"network",selectedCurrency:h,availableChains:b});else{let C=b[0];await u(C,h,b)}},[o,u,i]),currencies:y,isFetching:f}}(),[c,d]=m.useState(-1);return t.jsx(w,{title:"Select token",showBack:!0,onBack:()=>r({step:"intro"}),showClose:!0,onClose:e,watermark:!0,children:s.status==="error"?t.jsx(L,{children:t.jsx(ye,{children:"Failed to load tokens"})}):s.status==="loading"?t.jsx(L,{children:t.jsx(fe,{})}):t.jsx(re,{style:{marginTop:"1rem",height:"22rem"},$colorScheme:"light",children:a.map((o,i)=>t.jsxs(Y,{$selected:c===i,disabled:l,onClick:()=>{d(i),n(o)},children:[t.jsx(J,{src:o.logoURI,alt:o.symbol}),t.jsx(G,{children:o.name}),l&&i===c?t.jsx(Z,{}):t.jsx(be,{children:o.symbol})]},o.symbol))})})}function mr({address:e,onClick:r}){let[s,n]=m.useState(!1);return t.jsx(t.Fragment,{children:s?t.jsx(pr,{onClick:()=>n(!1),style:{marginTop:"1.5rem"},children:t.jsx(Ee,{url:e,size:312,hideLogo:!0})}):t.jsxs(fr,{title:"Click to copy address",onClick:r,style:{marginTop:"1.5rem"},children:[t.jsxs(hr,{children:[t.jsx(gr,{children:"Deposit address"}),t.jsx(yr,{children:e})]}),t.jsx(br,{children:t.jsx(Cr,{type:"button",onClick:a=>{a.stopPropagation(),n(!0)},children:t.jsx(ee,{size:16,color:"var(--privy-color-icon-muted)"})})})]})})}let pr=p.div`
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  overflow: hidden;
`,fr=p.div`
  display: flex;
  border-radius: var(--privy-border-radius-md);
  background: var(--privy-color-background-clicked, #f1f2f9);
  padding: 1rem;
  cursor: pointer;
  gap: 0.5rem;
`,hr=p.div`
  flex: 1;
  min-width: 0;
  text-align: left;
`,gr=p.div`
  font-size: 0.75rem;
  color: var(--privy-color-icon-muted);
  line-height: 1rem;
  margin-bottom: 0.25rem;
`,yr=p.div`
  word-break: break-all;
  font-size: 0.875rem;
  font-family: ui-monospace, monospace;
  font-weight: 500;
  line-height: 1.375rem;
  color: var(--privy-color-foreground);
`,br=p.div`
  width: 1.5rem;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 0.25rem;
`,Cr=p.button`
  && {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    box-shadow: none;
    border-radius: var(--privy-border-radius-xs);

    &:hover {
      background: var(--privy-color-background);
    }

    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }
  }
`;function xr({quote:e,selectedCurrency:r,selectedChain:s,destinationSymbol:n}){let[a,l]=m.useState(!1),c=r.symbol.toUpperCase(),d=s.displayName,o=m.useRef(null);return t.jsxs(Er,{children:[t.jsxs(vr,{onClick:m.useCallback(()=>{let i=document.getElementById("privy-modal-content");i&&(o.current&&clearTimeout(o.current),i.style.transition="none",o.current=setTimeout(()=>{i.style.transition="",o.current=null},160)),l(u=>!u)},[]),children:[t.jsxs(_r,{children:[r.logoURI&&t.jsx(J,{src:r.logoURI,alt:c,style:{width:"2rem",height:"2rem"}}),s.iconUrl&&t.jsx(wr,{src:s.iconUrl,alt:d})]}),t.jsxs(Tr,{children:[t.jsx(kr,{children:"You send"}),t.jsxs(Sr,{children:[c," on ",d]})]}),t.jsx(jr,{children:t.jsx(a?Xe:Ie,{size:16})})]}),t.jsx(Dr,{$expanded:a,children:t.jsx(Ir,{children:t.jsxs(Nr,{children:[e.indicative_rate&&t.jsxs(A,{children:[t.jsx(D,{children:"Conversion rate"}),t.jsxs(I,{style:{display:"flex",alignItems:"center",gap:"0.25rem"},children:[Ge(e.indicative_rate,c,n.toUpperCase()),t.jsx(Rr,{content:"Estimated rate based on current market conditions. Final execution price may vary depending on transfer size and routing."})]})]}),t.jsxs(A,{children:[t.jsx(D,{children:"Max slippage"}),t.jsxs(I,{children:[(e.slippage_bps/100).toFixed(1),"%"]})]}),t.jsxs(A,{children:[t.jsx(D,{children:"Refund address"}),t.jsx(I,{children:t.jsx(De,{value:e.refund_address,iconOnly:!0,iconSize:11,children:ge(e.refund_address,4,4)})})]})]})})}),t.jsxs(Ur,{children:[t.jsx(F,{size:16,color:"var(--privy-color-icon-muted)",style:{flexShrink:0}}),t.jsxs(Ar,{children:["Only send ",t.jsx("strong",{children:c})," on ",t.jsx("strong",{children:d}),". Other assets may be lost."]})]})]})}let Er=p.div`
  border-radius: var(--privy-border-radius-md);
  border: 1px solid var(--privy-color-foreground-4);
  overflow: hidden;
`,vr=p.button`
  && {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--privy-color-foreground);
    outline: none;
    box-shadow: none;

    &:focus,
    &:focus-visible {
      outline: none;
      box-shadow: none;
    }
  }
`,_r=p.span`
  position: relative;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
`,wr=p(K)`
  && {
    position: absolute;
    top: -0.125rem;
    right: -0.25rem;
    width: 0.75rem;
    height: 0.75rem;
    box-sizing: content-box;
    border: 1.5px solid #fff;
    background-color: #fff;
  }
`,Tr=p.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`,kr=p.span`
  font-size: 0.75rem;
  color: var(--privy-color-foreground-3);
  line-height: 1rem;
`,Sr=p.span`
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
`,jr=p.span`
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: var(--privy-border-radius-full);
  background-color: var(--privy-color-background-clicked, #f1f2f9);
  color: var(--privy-color-foreground-3);
`,Nr=p.div`
  display: flex;
  flex-direction: column;
  padding: 0 1rem 0.75rem;

  & > * {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--privy-color-foreground-4);
  }

  & > *:last-child {
    border-bottom: none;
  }
`,Ur=p.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0.75rem 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--privy-border-radius-sm);
  background: #f8f9fc;
`,Ar=p.span`
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: var(--privy-color-icon-muted);
  text-align: left;
`,Dr=p.div`
  display: grid;
  grid-template-rows: ${({$expanded:e})=>e?"1fr":"0fr"};
  transition: grid-template-rows 150ms ease-out;
`,Ir=p.div`
  overflow: hidden;
`;function Rr({content:e}){let[r,s]=m.useState(!1),{refs:n,floatingStyles:a,context:l}=ve({open:r,onOpenChange:s,placement:"top",whileElementsMounted:Fe,middleware:[$e(6),Pe(),Le({padding:8})]}),c=_e(l,{move:!1,handleClose:we()}),d=Te(l),{getReferenceProps:o,getFloatingProps:i}=ke([c,d,Se(l),je(l),Ne(l,{role:"tooltip"})]),{isMounted:u,styles:f}=Ue(l,{duration:150});return t.jsxs(t.Fragment,{children:[t.jsx("button",{ref:n.setReference,type:"button","aria-label":"More information about conversion rate",style:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:0,border:"none",background:"none",color:"var(--privy-color-icon-muted)",cursor:"pointer"},...o(),children:t.jsx(Oe,{size:14})}),u&&t.jsx(Ae,{root:document.getElementById("privy-modal-content")??void 0,children:t.jsx(Or,{ref:n.setFloating,style:{...a,...f},...i(),children:e})})]})}let Or=p.div`
  max-width: 13rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--privy-border-radius-sm, 0.375rem);
  background: var(--privy-color-foreground);
  color: var(--privy-color-background);
  font-size: 0.6875rem;
  line-height: 1rem;
  font-weight: 400;
  text-align: left;
  z-index: 10;
`;const Fr=({quote:e,selectedCurrency:r,selectedChain:s,destinationSymbol:n,onBack:a,onClose:l})=>{var f;let[c,d]=m.useState(!1),o=((f=r==null?void 0:r.symbol)==null?void 0:f.toUpperCase())??"funds",i=(s==null?void 0:s.displayName)??"",u=async()=>{c||(await navigator.clipboard.writeText(e.deposit_address),d(!0),setTimeout(()=>d(!1),2e3))};return t.jsxs(w,{title:`Send ${o}${i?` on ${i}`:""}`,subtitle:"Send funds to the address below. Conversion and routing handled by Relay.",showBack:!0,onBack:a,showClose:!0,onClose:l,watermark:!1,children:[t.jsx(xr,{quote:e,selectedCurrency:r,selectedChain:s,destinationSymbol:n}),t.jsx(mr,{address:e.deposit_address,onClick:u}),t.jsx(xe,{style:{marginTop:"1rem",marginBottom:"0.5rem",...c?{backgroundColor:"var(--privy-color-icon-success)",borderColor:"var(--privy-color-icon-success)"}:{}},onClick:u,children:c?t.jsxs(t.Fragment,{children:["Copied ",t.jsx($,{size:16,style:{marginLeft:"0.25rem"}})]}):"Copy address"}),t.jsx($r,{children:"Routing and bridging are handled by Relay. Privy does not control execution timing, liquidity, or transaction outcomes."})]})};let $r=p.p`
  && {
    margin: 0.5rem 0 0;
    font-size: 0.6875rem;
    line-height: 1.125rem;
    color: var(--privy-color-icon-muted);
    text-align: center;
  }
`;function Pr(){let{state:e,configData:r,setModalState:s,close:n,params:a}=E("address"),{quote:l,selectedCurrency:c,selectedChain:d,availableChains:o}=e;return function({depositAddressId:i,enabled:u,quoteCreatedAt:f}){let{privy:y}=v(),{setModalState:h}=g();m.useEffect(()=>{if(!i)return;let b=new AbortController;return P.waitForDeposit({privy:y,depositAddressId:i,quoteCreatedAt:f,signal:b.signal}).then(C=>{b.signal.aborted||(C.status==="success"?le(C.order,h):C.status==="timeout"&&h({step:"error",code:"TIMEOUT_WAITING_FOR_NEXT_ORDER"}))}),()=>{b.abort()}},[u,i,y,f,h])}({depositAddressId:l.id,enabled:!0,quoteCreatedAt:l.created_at}),t.jsx(Fr,{quote:l,selectedCurrency:c,selectedChain:d,destinationSymbol:m.useMemo(()=>R({address:a.destinationCurrency,caip2:a.destinationChain,config:r}).symbol,[a,r]),onBack:()=>s({step:"network",selectedCurrency:c,availableChains:o}),onClose:n})}function Lr(){let{modalState:e,setModalState:r}=g();return t.jsx(Ke,{onError:s=>r({step:"error",code:"UNEXPECTED_STATE",message:s.message}),resetKey:e.step,children:t.jsx(Mr,{})})}function Mr(){let{modalState:e}=g();switch(e.step){case"intro":return t.jsx(or,{});case"token":return t.jsx(ur,{});case"network":return t.jsx(ar,{});case"address":return t.jsx(Pr,{});case"processing":return t.jsx(cr,{});case"complete":return t.jsx(rr,{});case"refunded":return t.jsx(dr,{});case"failed":return t.jsx(sr,{});case"error":return t.jsx(tr,{});default:return null}}var ot={component:()=>{let{onUserCloseViaDialogOrKeybindRef:e}=pe(),r=_(),{close:s,config:n}=g();return m.useEffect(()=>{e.current=s},[e,s]),m.useEffect(()=>{if(n.status==="ready"){for(let a of n.data.currencies)new Image().src=a.logoURI;for(let a of Object.values(n.data.chains))new Image().src=a.iconUrl}},[n]),r?t.jsx(Lr,{}):null}};export{ot as default};
