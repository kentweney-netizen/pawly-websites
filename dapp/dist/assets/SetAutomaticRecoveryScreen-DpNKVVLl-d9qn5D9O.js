import{dI as R,d8 as U,d5 as A,da as u,d7 as e,em as v,ey as j,dE as P,dA as W}from"./index-CXlKrUqI.js";import{F as M}from"./ExclamationTriangleIcon-B4d4OPvK.js";import{F as V}from"./LockClosedIcon-ImSCUPDF.js";import{T as S,k as b,u as $}from"./ModalHeader-CAqKnddp-DW_wjXlK.js";import{r as H}from"./Subtitle-CV-2yKE4-36hfrSRv.js";import{e as k}from"./Title-BnzYV3Is-BwjalVfe.js";const D=W.div`
  && {
    border-width: 4px;
  }

  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  aspect-ratio: 1;
  border-style: solid;
  border-color: ${l=>l.$color??"var(--privy-color-accent)"};
  border-radius: 50%;
`,B={component:()=>{var p;let{user:l}=R(),{client:T,walletProxy:m,refreshSessionAndUser:E,closePrivyModal:i}=U(),s=A(),{entropyId:f,entropyIdVerifier:C}=((p=s.data)==null?void 0:p.recoverWallet)??{},[n,h]=u.useState(!1),[c,F]=u.useState(null),[d,g]=u.useState(null);function y(){var r,o,t,a;if(!n){if(d)return(o=(r=s.data)==null?void 0:r.setWalletPassword)==null||o.onFailure(d),void i();if(!c)return(a=(t=s.data)==null?void 0:t.setWalletPassword)==null||a.onFailure(Error("User exited set recovery flow")),void i()}}s.onUserCloseViaDialogOrKeybindRef.current=y;let I=!(!n&&!c);return e.jsxs(e.Fragment,d?{children:[e.jsx(S,{onClose:y},"header"),e.jsx(D,{$color:"var(--privy-color-error)",style:{alignSelf:"center"},children:e.jsx(M,{height:38,width:38,stroke:"var(--privy-color-error)"})}),e.jsx(k,{style:{marginTop:"0.5rem"},children:"Something went wrong"}),e.jsx(v,{style:{minHeight:"2rem"}}),e.jsx(b,{onClick:()=>g(null),children:"Try again"}),e.jsx($,{})]}:{children:[e.jsx(S,{onClose:y},"header"),e.jsx(V,{style:{width:"3rem",height:"3rem",alignSelf:"center"}}),e.jsx(k,{style:{marginTop:"0.5rem"},children:"Automatically secure your account"}),e.jsx(H,{style:{marginTop:"1rem"},children:"When you log into a new device, you’ll only need to authenticate to access your account. Never get logged out if you forget your password."}),e.jsx(v,{style:{minHeight:"2rem"}}),e.jsx(b,{loading:n,disabled:I,onClick:()=>async function(){h(!0);try{let r=await T.getAccessToken(),o=j(l,f);if(!r||!m||!o)return;if(!(await m.setRecovery({accessToken:r,entropyId:f,entropyIdVerifier:C,existingRecoveryMethod:o.recoveryMethod,recoveryMethod:"privy"})).entropyId)throw Error("Unable to set recovery on wallet");let t=await E();if(!t)throw Error("Unable to set recovery on wallet");let a=j(t,o.address);if(!a)throw Error("Unabled to set recovery on wallet");F(!!t),setTimeout(()=>{var w,x;(x=(w=s.data)==null?void 0:w.setWalletPassword)==null||x.onSuccess(a),i()},P)}catch(r){g(r)}finally{h(!1)}}(),children:c?"Success":"Confirm"}),e.jsx($,{})]})}};export{B as SetAutomaticRecoveryScreen,B as default};
