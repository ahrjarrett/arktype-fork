"use strict";(self.webpackChunkredo_dev=self.webpackChunkredo_dev||[]).push([[991],{8044:(e,t,r)=>{r.d(t,{Zo:()=>u,kt:()=>f});var n=r(9231);function o(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function a(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?a(Object(r),!0).forEach((function(t){o(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):a(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function s(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}var c=n.createContext({}),l=function(e){var t=n.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},u=function(e){var t=l(e.components);return n.createElement(c.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var r=e.components,o=e.mdxType,a=e.originalType,c=e.parentName,u=s(e,["components","mdxType","originalType","parentName"]),d=l(r),f=o,y=d["".concat(c,".").concat(f)]||d[f]||p[f]||a;return r?n.createElement(y,i(i({ref:t},u),{},{components:r})):n.createElement(y,i({ref:t},u))}));function f(e,t){var r=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=r.length,i=new Array(a);i[0]=d;var s={};for(var c in t)hasOwnProperty.call(t,c)&&(s[c]=t[c]);s.originalType=e,s.mdxType="string"==typeof e?e:o,i[1]=s;for(var l=2;l<a;l++)i[l]=r[l];return n.createElement.apply(null,i)}return n.createElement.apply(null,r)}d.displayName="MDXCreateElement"},7331:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>m,contentTitle:()=>f,default:()=>g,frontMatter:()=>d,metadata:()=>y,toc:()=>b});var n=r(8044),o=Object.defineProperty,a=Object.defineProperties,i=Object.getOwnPropertyDescriptors,s=Object.getOwnPropertySymbols,c=Object.prototype.hasOwnProperty,l=Object.prototype.propertyIsEnumerable,u=(e,t,r)=>t in e?o(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,p=(e,t)=>{for(var r in t||(t={}))c.call(t,r)&&u(e,r,t[r]);if(s)for(var r of s(t))l.call(t,r)&&u(e,r,t[r]);return e};const d={id:"intro",title:"Intro",sidebar_position:1},f="Assert",y={unversionedId:"intro",id:"intro",title:"Intro",description:"Under Construction",source:"@site/docs/assert/index.mdx",sourceDirName:".",slug:"/",permalink:"/assert/",draft:!1,tags:[],version:"current",sidebarPosition:1,frontMatter:{id:"intro",title:"Intro",sidebar_position:1},sidebar:"defaultSidebar"},m={},b=[{value:"Under Construction",id:"under-construction",level:2}],v={toc:b};function g(e){var t,r=e,{components:o}=r,u=((e,t)=>{var r={};for(var n in e)c.call(e,n)&&t.indexOf(n)<0&&(r[n]=e[n]);if(null!=e&&s)for(var n of s(e))t.indexOf(n)<0&&l.call(e,n)&&(r[n]=e[n]);return r})(r,["components"]);return(0,n.kt)("wrapper",(t=p(p({},v),u),a(t,i({components:o,mdxType:"MDXLayout"}))),(0,n.kt)("h1",p({},{id:"assert"}),"Assert"),(0,n.kt)("h2",p({},{id:"under-construction"}),"Under Construction"),(0,n.kt)("p",null,"Ever wonder how we maintain such strict parity between @re-/type's runtime behavior, its inferred types, and TypeScript's own definitions?"),(0,n.kt)("p",null,"Given the unprecedented scope of @re-/type as a project whose types are as important as its functionality, we found ourselves in need of a unit testing framework designed to test them together."),(0,n.kt)("p",null,"From a single statement, @re-/assert allows you to make assertions about types, values or both:"),(0,n.kt)("pre",null,(0,n.kt)("code",p({parentName:"pre"},{className:"language-ts"}),'assert(o).equals({ re: "do" }).typed as { re: string }\n')),(0,n.kt)("p",null,"We're actively relying on @re-/assert for hundreds of tests in @re-/type, but still need to freeze the API and add documentation."),(0,n.kt)("p",null,"If you want to learn more, the project is tracked ",(0,n.kt)("a",p({parentName:"p"},{href:"https://github.com/re-do/re-po/projects/1"}),"here"),"."),(0,n.kt)("p",null,"If you're interested in contributing, check out our guide ",(0,n.kt)("a",p({parentName:"p"},{href:"https://github.com/re-do/re-po/blob/main/CONTRIBUTING.md"}),"here")," or, if you really want to make my day, reach out to ",(0,n.kt)("a",p({parentName:"p"},{href:"mailto:david@redo.dev"}),"david@redo.dev"),". I'd love to talk about your ideas or suggest issues that might be a good fit! \ud83d\ude3b"),(0,n.kt)("div",null,(0,n.kt)("img",{style:{height:300},src:"/img/construction.svg",alt:"Under Construction"})))}g.isMDXComponent=!0}}]);