import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import DOMPurify from 'dompurify';
function load(file, dependencies={}) { const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const m={exports:{}};vm.runInNewContext(code,{module:m,exports:m.exports,require(name){assert.ok(name in dependencies,name);return dependencies[name]}});return m.exports; }
const formatting=load('../lib/discord/formatMentions.ts');
const Markdown=load('../components/utils/MarkdownContent.tsx',{'react/jsx-runtime':jsxRuntime,react:React,'react-markdown':ReactMarkdown,'remark-gfm':remarkGfm,'rehype-sanitize':rehypeSanitize,dompurify:DOMPurify,'@/lib/discord/formatMentions':formatting}).default;

test('mentions use only supplied public names and safe deleted/unknown fallbacks',()=>{
 assert.equal(formatting.normalizeDiscordMentions('<@123> <@!456> <@&789> <#123>'), '@Member @Member @Role #channel');
 assert.equal(formatting.normalizeDiscordMentions('<@123> <@&789> <#123>',{users:{123:'Pilot'},roles:{789:'Squad'},channels:{123:'briefing'}}),'@Pilot @Squad #briefing');
 assert.equal(formatting.normalizeDiscordMentions('<@123>',{users:{123:'[click](javascript:alert(1))'}}),'@\\[click\\](javascript:alert(1))');
});
test('spoilers stay concealed and Discord subtext remains readable as quoted text',()=>{
 const content=formatting.formatDiscordMarkdown('Title\n-# Supporting text\n||private spoiler||\n**Public**');
 assert.doesNotMatch(content,/private spoiler/);assert.match(content,/\[Spoiler hidden\]/);assert.match(content,/> Supporting text/);assert.match(content,/\*\*Public\*\*/);
});
test('rendered markdown never executes HTML, mention labels or javascript links',()=>{
 const html=renderToStaticMarkup(React.createElement(Markdown,{content:'<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))\n\n-# Small print\n\n||secret detail||\n\n**Safe text**'}));
 assert.doesNotMatch(html,/<script|<img|onerror=|href="javascript:|secret detail/);assert.match(html,/Small print/);assert.match(html,/<strong[^>]*>Safe text/);
});
