import{da as a,dI as _,d8 as I,d5 as T,d7 as e,ey as E,ez as F,e2 as U,dA as p,ef as W}from"./index-CXlKrUqI.js";import{F as N}from"./ShieldCheckIcon-D8Y8JPw1.js";import{m as O}from"./ModalHeader-CAqKnddp-DW_wjXlK.js";import{l as V}from"./Layouts-BlFm53ED-CId8FvOv.js";import{g as z,h as H,u as M,b as B,k as D}from"./shared-Cwq8m_h6-CviDia_9.js";import{w as t}from"./Screen-CLdp3cO6-BpR48GZK.js";import"./index-Dq_xe9dz-CXiEWXll.js";const re={component:()=>{let[o,y]=a.useState(!0),{authenticated:m,user:b}=_(),{walletProxy:i,closePrivyModal:v,createAnalyticsEvent:x,client:j}=I(),{navigate:k,data:A,onUserCloseViaDialogOrKeybindRef:$}=T(),[n,C]=a.useState(void 0),[f,d]=a.useState(""),[c,g]=a.useState(!1),{entropyId:u,entropyIdVerifier:S,onCompleteNavigateTo:w,onSuccess:h,onFailure:P}=A.recoverWallet,l=(r="User exited before their wallet could be recovered")=>{v({shouldCallAuthOnSuccess:!1}),P(typeof r=="string"?new U(r):r)};return $.current=l,a.useEffect(()=>{if(!m)return l("User must be authenticated and have a Privy wallet before it can be recovered")},[m]),e.jsxs(t,{children:[e.jsx(t.Header,{icon:N,title:"Enter your password",subtitle:"Please provision your account on this new device. To continue, enter your recovery password.",showClose:!0,onClose:l}),e.jsx(t.Body,{children:e.jsx(K,{children:e.jsxs("div",{children:[e.jsxs(z,{children:[e.jsx(H,{type:o?"password":"text",onChange:r=>(s=>{s&&C(s)})(r.target.value),disabled:c,style:{paddingRight:"2.3rem"}}),e.jsx(M,{style:{right:"0.75rem"},children:o?e.jsx(B,{onClick:()=>y(!1)}):e.jsx(D,{onClick:()=>y(!0)})})]}),!!f&&e.jsx(Y,{children:f})]})})}),e.jsxs(t.Footer,{children:[e.jsx(t.HelpText,{children:e.jsxs(V,{children:[e.jsx("h4",{children:"Why is this necessary?"}),e.jsx("p",{children:"You previously set a password for this wallet. This helps ensure only you can access it"})]})}),e.jsx(t.Actions,{children:e.jsx(G,{loading:c||!i,disabled:!n,onClick:async()=>{g(!0);let r=await j.getAccessToken(),s=E(b,u);if(!r||!s||n===null)return l("User must be authenticated and have a Privy wallet before it can be recovered");try{x({eventName:"embedded_wallet_recovery_started",payload:{walletAddress:s.address}}),await(i==null?void 0:i.recover({accessToken:r,entropyId:u,entropyIdVerifier:S,recoveryPassword:n})),d(""),w?k(w):v({shouldCallAuthOnSuccess:!1}),h==null||h(s),x({eventName:"embedded_wallet_recovery_completed",payload:{walletAddress:s.address}})}catch(R){F(R)?d("Invalid recovery password, please try again."):d("An error has occurred, please try again.")}finally{g(!1)}},$hideAnimations:!u&&c,children:"Recover your account"})}),e.jsx(t.Watermark,{})]})]})}};let K=p.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,Y=p.div`
  line-height: 20px;
  height: 20px;
  font-size: 13px;
  color: var(--privy-color-error);
  text-align: left;
  margin-top: 0.5rem;
`,G=p(O)`
  ${({$hideAnimations:o})=>o&&W`
      && {
        // Remove animations because the recoverWallet task on the iframe partially
        // blocks the renderer, so the animation stutters and doesn't look good
        transition: none;
      }
    `}
`;export{re as PasswordRecoveryScreen,re as default};
