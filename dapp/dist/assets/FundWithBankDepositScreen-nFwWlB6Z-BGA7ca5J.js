import{dI as P,d5 as z,da as f,fd as D,d7 as t,fe as V,dG as M,dA as w}from"./index-CXlKrUqI.js";import{p as R}from"./CopyableText-ChtfBWx4-UcFLU4sA.js";import{n as C}from"./ScreenLayout-Yoa2TSpi-DcWpKHqg.js";import{i as Y}from"./InfoBanner-DkQEPd77-Bv4GCdMq.js";import{w as q,c as H,p as K}from"./SelectSourceAsset-CgO1cpz4-DeVPzekZ.js";import{r as E}from"./chevron-down-CS73oApA.js";import{c as N}from"./createLucideIcon-Cc9YfBd0.js";import{H as O}from"./hourglass-B0TIQEec.js";import{C as G}from"./check-B_wgVyfz.js";import{C as U}from"./circle-x-B3gPJQQE.js";import"./copy-NOK6Zkfw.js";import"./ModalHeader-CAqKnddp-DW_wjXlK.js";import"./Screen-CLdp3cO6-BpR48GZK.js";import"./index-Dq_xe9dz-CXiEWXll.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X=[["path",{d:"m16 11 2 2 4-4",key:"9rsbq5"}],["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],J=N("user-check",X),Q=e=>{try{return e.location.origin}catch{return}},Z=({data:e,onClose:a})=>t.jsx(C,{showClose:!0,onClose:a,title:"Initiate bank transfer",subtitle:"Use the details below to complete a bank transfer from your bank.",primaryCta:{label:"Done",onClick:a},watermark:!1,footerText:"Exchange rates and fees are set when you authorize and determine the amount you receive. You'll see the applicable rates and fees for your transaction separately",children:t.jsx(ee,{children:(V[e.deposit_instructions.asset]||[]).map(([u,y],h)=>{let d=e.deposit_instructions[u];if(!d||Array.isArray(d))return null;let o=u==="asset"?d.toUpperCase():d,g=o.length>100?`${o.slice(0,9)}...${o.slice(-9)}`:o;return t.jsxs(te,{children:[t.jsx(se,{children:y}),t.jsx(R,{value:o,includeChildren:M,children:t.jsx(re,{children:g})})]},h)})})});let ee=w.ol`
  border-color: var(--privy-color-border-default);
  border-width: 1px;
  border-radius: var(--privy-border-radius-mdlg);
  border-style: solid;
  display: flex;
  flex-direction: column;

  && {
    padding: 0 1rem;
  }
`,te=w.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;

  &:not(:first-of-type) {
    border-top: 1px solid var(--privy-color-border-default);
  }

  & > {
    :nth-child(1) {
      flex-basis: 30%;
    }

    :nth-child(2) {
      flex-basis: 60%;
    }
  }
`,se=w.span`
  color: var(--privy-color-foreground);
  font-kerning: none;
  font-variant-numeric: lining-nums proportional-nums;
  font-feature-settings: 'calt' off;

  /* text-xs/font-regular */
  font-size: 0.75rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.125rem; /* 150% */

  text-align: left;
  flex-shrink: 0;
`,re=w.span`
  color: var(--privy-color-foreground);
  font-kerning: none;
  font-feature-settings: 'calt' off;

  /* text-sm/font-medium */
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 500;
  line-height: 1.375rem; /* 157.143% */

  text-align: right;
  word-break: break-all;
`;const oe=({onClose:e})=>t.jsx(C,{showClose:!0,onClose:e,icon:U,iconVariant:"error",title:"Something went wrong",subtitle:"We couldn't complete account setup. This isn't caused by anything you did.",primaryCta:{label:"Close",onClick:e},watermark:!0}),ae=({onClose:e,reason:a})=>{let u=a?a.charAt(0).toLowerCase()+a.slice(1):void 0;return t.jsx(C,{showClose:!0,onClose:e,icon:U,iconVariant:"error",title:"Identity verification failed",subtitle:u?`We can't complete identity verification because ${u}. Please try again or contact support for assistance.`:"We couldn't verify your identity. Please try again or contact support for assistance.",primaryCta:{label:"Close",onClick:e},watermark:!0})},ie=({onClose:e,email:a})=>t.jsx(C,{showClose:!0,onClose:e,icon:O,title:"Identity verification in progress",subtitle:"We're waiting for Persona to approve your identity verification. This usually takes a few minutes, but may take up to 24 hours.",primaryCta:{label:"Done",onClick:e},watermark:!0,children:t.jsxs(Y,{theme:"light",children:["You'll receive an email at ",a," once approved with instructions for completing your deposit."]})}),ne=({onClose:e,onAcceptTerms:a,isLoading:u})=>t.jsx(C,{showClose:!0,onClose:e,icon:J,title:"Verify your identity to continue",subtitle:"Finish verification with Persona — it takes just a few minutes and requires a government ID.",helpText:t.jsxs(t.Fragment,{children:[`This app uses Bridge to securely connect accounts and move funds. By clicking "Accept," you agree to Bridge's`," ",t.jsx("a",{href:"https://www.bridge.xyz/legal",target:"_blank",rel:"noopener noreferrer",children:"Terms of Service"})," ","and"," ",t.jsx("a",{href:"https://www.bridge.xyz/legal/row-privacy-policy/bridge-building-limited",target:"_blank",rel:"noopener noreferrer",children:"Privacy Policy"}),"."]}),primaryCta:{label:"Accept and continue",onClick:a,loading:u},watermark:!0}),le=({onClose:e})=>t.jsx(C,{showClose:!0,onClose:e,icon:G,iconVariant:"success",title:"Identity verified successfully",subtitle:"We've successfully verified your identity. Now initiate a bank transfer to view instructions.",primaryCta:{label:"Initiate bank transfer",onClick:()=>{},loading:!0},watermark:!0}),ce=({opts:e,onClose:a,onEditSourceAsset:u,onSelectAmount:y,isLoading:h})=>t.jsxs(C,{showClose:!0,onClose:a,headerTitle:`Buy ${e.destination.asset.toLocaleUpperCase()}`,primaryCta:{label:"Continue",onClick:y,loading:h},watermark:!0,children:[t.jsx(H,{currency:e.source.selectedAsset,inputMode:"decimal",autoFocus:!0}),t.jsx(K,{selectedAsset:e.source.selectedAsset,onEditSourceAsset:u})]}),ue=({onClose:e,onAcceptTerms:a,onSelectAmount:u,onSelectSource:y,onEditSourceAsset:h,opts:d,state:o,email:g,isLoading:n})=>o.status==="select-amount"?t.jsx(ce,{onClose:e,onSelectAmount:u,onEditSourceAsset:h,opts:d,isLoading:n}):o.status==="select-source-asset"?t.jsx(q,{onSelectSource:y,opts:d,isLoading:n}):o.status==="kyc-prompt"?t.jsx(ne,{onClose:e,onAcceptTerms:a,opts:d,isLoading:n}):o.status==="kyc-incomplete"?t.jsx(ie,{onClose:e,email:g}):o.status==="kyc-success"?t.jsx(le,{onClose:e}):o.status==="kyc-error"?t.jsx(ae,{onClose:e,reason:o.reason}):o.status==="account-details"?t.jsx(Z,{onClose:e,data:o.data}):o.status==="create-customer-error"||o.status==="get-customer-error"?t.jsx(oe,{onClose:e}):null,Ae={component:()=>{let{user:e}=P(),a=z().data;if(!(a!=null&&a.FundWithBankDepositScreen))throw Error("Missing data");let{onSuccess:u,onFailure:y,opts:h,createOrUpdateCustomer:d,getCustomer:o,getOrCreateVirtualAccount:g}=a.FundWithBankDepositScreen,[n,A]=f.useState(h),[v,r]=f.useState({status:"select-amount"}),[x,l]=f.useState(null),[_,i]=f.useState(!1),k=f.useRef(null),T=f.useCallback(async()=>{var b,m;let s;i(!0),l(null);try{s=await o({kycRedirectUrl:window.location.origin})}catch(c){if(!c||typeof c!="object"||!("status"in c)||c.status!==404)return r({status:"get-customer-error"}),l(c),void i(!1)}if(!s)try{s=await d({hasAcceptedTerms:!1,kycRedirectUrl:window.location.origin})}catch(c){return r({status:"create-customer-error"}),l(c),void i(!1)}if(!s)return r({status:"create-customer-error"}),l(Error("Unable to create customer")),void i(!1);if(s.status==="not_started"&&s.kyc_url)return r({status:"kyc-prompt",kycUrl:s.kyc_url}),void i(!1);if(s.status==="not_started")return r({status:"get-customer-error"}),l(Error("Unexpected user state")),void i(!1);if(s.status==="rejected")return r({status:"kyc-error",reason:(m=(b=s.rejection_reasons)==null?void 0:b[0])==null?void 0:m.reason}),l(Error("User KYC rejected.")),void i(!1);if(s.status==="incomplete")return r({status:"kyc-incomplete"}),void i(!1);if(s.status!=="active")return r({status:"get-customer-error"}),l(Error("Unexpected user state")),void i(!1);s.status;try{let c=await g({destination:n.destination,provider:n.provider,source:{asset:n.source.selectedAsset}});r({status:"account-details",data:c})}catch(c){return r({status:"create-customer-error"}),l(c),void i(!1)}},[n]),L=f.useCallback(async()=>{var c,S;if(l(null),i(!0),v.status!=="kyc-prompt")return l(Error("Unexpected state")),void i(!1);let s=D({location:v.kycUrl});if(await d({hasAcceptedTerms:!0}),!s)return l(Error("Unable to begin kyc flow.")),i(!1),void r({status:"create-customer-error"});k.current=new AbortController;let b=await(async(p,W)=>{let j=await E({operation:async()=>({done:Q(p)===window.location.origin,closed:p.closed}),until:({done:B,closed:F})=>B||F,delay:0,interval:500,attempts:360,signal:W});return j.status==="aborted"?(p.close(),{status:"aborted"}):j.status==="max_attempts"?{status:"timeout"}:j.result.done?(p.close(),{status:"redirected"}):{status:"closed"}})(s,k.current.signal);if(b.status==="aborted")return;if(b.status==="closed")return void i(!1);b.status;let m=await E({operation:()=>o({}),until:p=>p.status==="active"||p.status==="rejected",delay:0,interval:2e3,attempts:60,signal:k.current.signal});if(m.status!=="aborted"){if(m.status==="max_attempts")return r({status:"kyc-incomplete"}),void i(!1);if(m.status,m.result.status==="rejected")return r({status:"kyc-error",reason:(S=(c=m.result.rejection_reasons)==null?void 0:c[0])==null?void 0:S.reason}),l(Error("User KYC rejected.")),void i(!1);if(m.result.status!=="active")return r({status:"kyc-incomplete"}),void i(!1);s.closed||s.close(),m.result.status;try{r({status:"kyc-success"});let p=await g({destination:n.destination,provider:n.provider,source:{asset:n.source.selectedAsset}});r({status:"account-details",data:p})}catch(p){r({status:"create-customer-error"}),l(p)}finally{i(!1)}}},[r,l,i,d,g,v,n,k]),I=f.useCallback(s=>{r({status:"select-amount"}),A({...n,source:{...n.source,selectedAsset:s}})},[r,A]),$=f.useCallback(()=>{r({status:"select-source-asset"})},[r]);return t.jsx(ue,{onClose:f.useCallback(async()=>{var s;(s=k.current)==null||s.abort(),x?y(x):await u()},[x,k]),opts:n,state:v,isLoading:_,email:e.email.address,onAcceptTerms:L,onSelectAmount:T,onSelectSource:I,onEditSourceAsset:$})}};export{Ae as FundWithBankDepositScreen,Ae as default};
