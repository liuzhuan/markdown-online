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

// 监听编辑器的粘贴事件，用于处理图片上传
const onPasteHandler = EditorView.domEventHandlers({
  paste(event, view) {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result;
          const transaction = view.state.update({
            changes: {
              from: view.state.selection.main.head,
              insert: `\n![image](${base64})\n`,
            },
          });
          view.dispatch(transaction);
        };
        reader.readAsDataURL(file);
      }
    }
  },
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
    onPasteHandler,
    placeholder('Input some Markdown'),
  ],
});

init();

function init() {
  initPreview();

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
  preview.contentWindow.postMessage(md.render(rawMd), '*');
}

function initPreview() {
  preview.srcdoc = `
  <!doctype html>
  <html>
    <head>
      <style>${mdStyle}</style>
      <link rel="stylesheet" href="./highlight.js/11.9.0/styles/atom-one-dark.min.css">
      <script src="./highlight.js/11.9.0/highlight.min.js"></script>
      <script src="./highlight.js/11.9.0/languages/javascript.min.js"></script>
      <script src="./highlight.js/11.9.0/languages/go.min.js"></script>
      <script src="./highlight.js/11.9.0/languages/diff.min.js"></script>
      <script>
        window.addEventListener('message', (event) => {
          document.body.innerHTML = event.data;
          hljs.highlightAll();
        });
      </script>
    </head>
    <body>
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
