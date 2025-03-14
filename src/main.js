import { basicSetup } from 'codemirror';
import { EditorView, placeholder } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import markdownit from 'markdown-it';
import './style.css';
import mdStyle from './markdown.css?raw';

const md = markdownit();

const CACHE_KEY = '$$markdown-online$$';
const preview = document.getElementById('preview');

// 监听编辑器内容变化并进行防抖处理
const onUpdateHandler = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const content = update.state.doc.toString();
    debouncedUpdateContent(content);
  }
});

const debouncedUpdateContent = debounce((content) => {
  if (view.composing) return;

  // 更新预览区和本地缓存
  updatePreview(content);
  updateStore(content);
}, 500);

// 初始化编辑器
const view = new EditorView({
  doc: '',
  parent: document.getElementById('editor-wrapper'),
  extensions: [
    basicSetup,
    markdown(),
    EditorView.lineWrapping,
    onUpdateHandler,
    placeholder('Input some Markdown'),
  ],
});

init();

function init() {
  // 读取本地缓存并渲染页面
  const value = localStorage.getItem(CACHE_KEY);
  if (value) {
    updatePreview(value);

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
  }
}

function updatePreview(rawMd) {
  preview.srcdoc = `
  <!doctype html>
  <html>
    <head>
      <style>${mdStyle}</style>
    </head>
    <body>
      ${md.render(rawMd)}
    </body>
  </html>`;
}

function updateStore(value) {
  localStorage.setItem(CACHE_KEY, value);
}

function debounce(func, delay) {
  let timerId;

  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timerId);
    timerId = setTimeout(function () {
      func.apply(context, args);
    }, delay);
  };
}

const dragger = document.getElementById('dragger');
const eventTracker = document.getElementById('event-tracker');
let isSmallScreen = false;

const mql = window.matchMedia('(max-width: 767px)');
isSmallScreen = mql.matches;

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    const w = Math.round(width);
    const h = Math.round(height);
    eventTracker.textContent = `${w}x${h}`;
  }
});

mql.addEventListener('change', (e) => {
  isSmallScreen = e.matches;
});

dragger.addEventListener('pointerdown', handlePointerDown);

function handlePointerDown(e) {
  document.body.classList.add('dragging');
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('pointermove', handlePointerMove);

  resizeObserver.observe(eventTracker);
}

function handlePointerUp(e) {
  document.body.classList.remove('dragging');
  document.removeEventListener('pointerup', handlePointerUp);
  document.removeEventListener('pointermove', handlePointerMove);

  resizeObserver.unobserve(eventTracker);
}

function handlePointerMove(e) {
  const wrapper = document.getElementById('editor-wrapper');
  if (isSmallScreen) {
    wrapper.style.height = e.clientY + 'px';
  } else {
    wrapper.style.width = e.clientX + 'px';
  }
}
