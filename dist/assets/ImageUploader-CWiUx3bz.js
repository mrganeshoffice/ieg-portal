import{c as i,ax as f,af as E,T as N}from"./index-D9ZY4n8I.js";import{j as e}from"./motion-DGR54_Di.js";import{r as p}from"./react-Bi8pVGlq.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=i("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=i("CloudUpload",[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=i("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=i("ImagePlus",[["path",{d:"M16 5h6",key:"1vod17"}],["path",{d:"M19 2v6",key:"4bpg5p"}],["path",{d:"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",key:"1ue2ih"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=i("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=i("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]),h=4,g=["image/jpeg","image/png","image/webp"];function k(a){const r=/\.(jpe?g|png|webp)$/i.test(a.name);return!g.includes(a.type)||!r?"Use a JPG, JPEG, PNG or WebP image.":a.size>h*1024*1024?`Image is too large. Maximum size is ${h} MB.`:a.size===0?"This file is empty.":null}const D=a=>new Promise((r,l)=>{const o=new FileReader;o.onload=()=>r(String(o.result).split(",")[1]??""),o.onerror=()=>l(new Error("Could not read the image file.")),o.readAsDataURL(a)});async function A(a){const r=k(a);if(r)throw new Error(r);return f("/api/admin/thumbnails",{method:"POST",body:{mime:a.type,data:await D(a)}})}async function S(a){try{const r=a.split("/").pop()??"";return await f(`/api/admin/thumbnails/${encodeURIComponent(r)}`,{method:"DELETE"}),!0}catch{return!1}}function B({previewUrl:a,hasNewFile:r,onSelect:l,onClear:o,error:j,disabled:n}){const u=p.useRef(null),[m,c]=p.useState(!1),[v,x]=p.useState(null),y=t=>{if(!t)return;const s=k(t);x(s),s||l(t)},w=t=>{var s;t.preventDefault(),c(!1),n||y((s=t.dataTransfer.files)==null?void 0:s[0])},d=()=>{var t;return!n&&((t=u.current)==null?void 0:t.click())},M=t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),d())},b=v||j;return e.jsxs("div",{children:[e.jsx("input",{ref:u,type:"file",hidden:!0,accept:g.join(","),onChange:t=>{var s;y((s=t.target.files)==null?void 0:s[0]),t.target.value=""}}),a?e.jsxs("div",{className:"overflow-hidden rounded-2xl border border-line",children:[e.jsx("div",{className:"aspect-[16/10] bg-navy-900",children:e.jsx("img",{src:a,alt:"Selected thumbnail preview",className:"h-full w-full object-cover"})}),e.jsxs("div",{className:"flex flex-wrap gap-2 p-3",children:[e.jsxs("button",{type:"button",className:"btn-ghost !py-2",onClick:d,disabled:n,children:[e.jsx(E,{size:15}),"Replace image"]}),r&&e.jsxs("button",{type:"button",className:"btn-ghost !py-2 text-red-500",onClick:()=>{x(null),o()},disabled:n,children:[e.jsx(N,{size:15}),"Remove selection"]})]})]}):e.jsxs("div",{role:"button",tabIndex:n?-1:0,onClick:d,onKeyDown:M,"aria-label":"Upload thumbnail image. Drag a file here or press Enter to browse.",onDragOver:t=>{t.preventDefault(),n||c(!0)},onDragLeave:()=>c(!1),onDrop:w,className:`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-9 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${m?"border-brand bg-brand/10":"border-line bg-app/60 hover:border-brand/60"} ${n?"cursor-not-allowed opacity-60":""}`,children:[e.jsx("span",{className:"flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand",children:m?e.jsx(P,{size:24}):e.jsx(z,{size:24})}),e.jsx("p",{className:"text-sm font-semibold",children:"Drag and drop an image here"}),e.jsxs("p",{className:"text-xs text-muted",children:["or ",e.jsx("span",{className:"font-semibold text-brand underline",children:"browse files"})]}),e.jsxs("p",{className:"text-xs text-muted",children:["JPG, JPEG, PNG or WebP, up to ",h," MB. Wide 16:10 images look best."]})]}),b&&e.jsx("p",{role:"alert",className:"mt-1.5 text-xs font-medium text-red-500",children:b})]})}export{L as A,U as G,B as I,R as L,I as a,S as d,A as u};
