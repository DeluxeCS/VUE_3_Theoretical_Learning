const { effect, ref } = VueReactivity;

function createRenderer(options) {
  // 渲染功能
  function render(vNode, container) {
    if (vNode) {
      patch(container._vNode, vNode, container);
    } else {
      if (container._vNode) container.innerHTML = "";
    }
    container._vNode = vNode;
  }
  // 挂载、更新功能
  function patch(n1, n2, container) {
    if (!n1) {
      mountElement(n2, container);
    } else {
    }
  }
  // 仅挂载
  function mountElement(vNode, container) {
    const el = options.createElement(vNode.type);
    if (typeof vNode.children === "string") {
      options.setElementText(el, vNode.children);
    } else {
    }
    options.insert(el, container);
  }

  return {
    render,
  };
}
// 抽离PC的API
const renderer = createRenderer({
  createElement(tag) {
    return document.createElement(tag);
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor);
  },
});
const obj = ref("0");
const vNode = {
  type: "h1",
  children: obj.value,
};
effect(() => {
  renderer.render(vNode, document.getElementById("app"));
});
