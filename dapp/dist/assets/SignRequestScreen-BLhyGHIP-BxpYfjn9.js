import{dI as A,d8 as N,d5 as M,da as o,fj as O,dO as E,eJ as b,eK as C,d7 as a,dE as I,dA as p,dS as z,fk as q,fl as P}from"./index-CXlKrUqI.js";import{h as F}from"./CopyToClipboard-DSTf_eKU-C3W4uHOT.js";import{a as J}from"./Layouts-BlFm53ED-CId8FvOv.js";import{a as V,i as H}from"./JsonTree-aPaJmPx7-C3gWkS31.js";import{n as K}from"./ScreenLayout-Yoa2TSpi-DcWpKHqg.js";import{c as Q}from"./createLucideIcon-Cc9YfBd0.js";import"./ModalHeader-CAqKnddp-DW_wjXlK.js";import"./Screen-CLdp3cO6-BpR48GZK.js";import"./index-Dq_xe9dz-CXiEWXll.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]],B=Q("square-pen",W),G=p.img`
  && {
    height: ${e=>e.size==="sm"?"65px":"140px"};
    width: ${e=>e.size==="sm"?"65px":"140px"};
    border-radius: 16px;
    margin-bottom: 12px;
  }
`;let X=e=>{if(!z(e))return e;try{let s=q(e);return s.includes("�")?e:s}catch{return e}},Y=e=>{try{let s=P.decode(e),n=new TextDecoder().decode(s);return n.includes("�")?e:n}catch{return e}},Z=e=>{let{types:s,primaryType:n,...l}=e.typedData;return a.jsxs(a.Fragment,{children:[a.jsx(te,{data:l}),a.jsx(F,{text:(r=e.typedData,JSON.stringify(r,null,2)),itemName:"full payload to clipboard"})," "]});var r};const k=({method:e,messageData:s,copy:n,iconUrl:l,isLoading:r,success:g,walletProxyIsLoading:m,errorMessage:x,isCancellable:d,onSign:c,onCancel:y,onClose:u})=>a.jsx(K,{title:n.title,subtitle:n.description,showClose:!0,onClose:u,icon:B,iconVariant:"subtle",helpText:x?a.jsx(ee,{children:x}):void 0,primaryCta:{label:n.buttonText,onClick:c,disabled:r||g||m,loading:r},secondaryCta:d?{label:"Not now",onClick:y,disabled:r||g||m}:void 0,watermark:!0,children:a.jsxs(J,{children:[l?a.jsx(G,{style:{alignSelf:"center"},size:"sm",src:l,alt:"app image"}):null,a.jsxs($,{children:[e==="personal_sign"&&a.jsx(w,{children:X(s)}),e==="eth_signTypedData_v4"&&a.jsx(Z,{typedData:s}),e==="solana_signMessage"&&a.jsx(w,{children:Y(s)})]})]})}),ue={component:()=>{let{authenticated:e}=A(),{initializeWalletProxy:s,closePrivyModal:n}=N(),{navigate:l,data:r,onUserCloseViaDialogOrKeybindRef:g}=M(),[m,x]=o.useState(!0),[d,c]=o.useState(""),[y,u]=o.useState(),[f,T]=o.useState(null),[_,S]=o.useState(!1);o.useEffect(()=>{e||l("LandingScreen")},[e]),o.useEffect(()=>{s(O).then(i=>{x(!1),i||(c("An error has occurred, please try again."),u(new E(new b(d,C.E32603_DEFAULT_INTERNAL_ERROR.eipCode))))})},[]);let{method:R,data:j,confirmAndSign:v,onSuccess:D,onFailure:L,uiOptions:t}=r.signMessage,U={title:(t==null?void 0:t.title)||"Sign message",description:(t==null?void 0:t.description)||"Signing this message will not cost you any fees.",buttonText:(t==null?void 0:t.buttonText)||"Sign and continue"},h=i=>{i?D(i):L(y||new E(new b("The user rejected the request.",C.E4001_USER_REJECTED_REQUEST.eipCode))),n({shouldCallAuthOnSuccess:!1}),setTimeout(()=>{T(null),c(""),u(void 0)},200)};return g.current=()=>{h(f)},a.jsx(k,{method:R,messageData:j,copy:U,iconUrl:t!=null&&t.iconUrl&&typeof t.iconUrl=="string"?t.iconUrl:void 0,isLoading:_,success:f!==null,walletProxyIsLoading:m,errorMessage:d,isCancellable:t==null?void 0:t.isCancellable,onSign:async()=>{S(!0),c("");try{let i=await v();T(i),S(!1),setTimeout(()=>{h(i)},I)}catch(i){console.error(i),c("An error has occurred, please try again."),u(new E(new b(d,C.E32603_DEFAULT_INTERNAL_ERROR.eipCode))),S(!1)}},onCancel:()=>h(null),onClose:()=>h(f)})}};let $=p.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
`,ee=p.p`
  && {
    margin: 0;
    width: 100%;
    text-align: center;
    color: var(--privy-color-error-dark);
    font-size: 14px;
    line-height: 22px;
  }
`,te=p(V)`
  margin-top: 0;
`,w=p(H)`
  margin-top: 0;
`;export{ue as SignRequestScreen,k as SignRequestView,ue as default};
