const { effect, ref } = VueReactivity;

function createRenderer(options) {
  // 渲染功能
  function render(vNode, container) {
    if (vNode) {
      patch(container._vNode, vNode, container);
    } else {
      /**
       * 卸载操作（if (container._vNode) container.innerHTML = "";）
       * 注意一：发生卸载，组件生命周期钩子未调用
       * 注意二：元素存在自定义指令，卸载时正确执行指令钩子函数
       * 注意三：绑定DOM元素事件未移除
       */
      if (container._vNode) options.unmount(container._vNode);
    }
    container._vNode = vNode;
  }
  // 挂载、更新功能
  function patch(n1, n2, container) {
    if (n1 && n1.type !== n2.type) {
      options.unmount(n1);
      n1 = null;
    }
    // 此时，n1与n2类型一致
    const { type } = n2;
    if (typeof type === "string") {
      if (!n1) {
        mountElement(n2, container);
      } else {
        patchElement(n1, n2);
      }
    } else if (typeof type === "object") {
      // 组件
    } else {
      // 其他
    }
  }
  // 做特殊处理
  function shouldSetAsProps(el, key, value) {
    if (key === "form" && el.targetName === "INPUT") return false;
    return key in el;
  }
  // 仅挂载
  function mountElement(vNode, container) {
    const el = (vNode.el = options.createElement(vNode.type));
    if (typeof vNode.children === "string") {
      options.setElementText(el, vNode.children);
    } else if (Array.isArray(vNode.children)) {
      vNode.children.forEach(child => {
        patch(null, child, el);
      });
    }
    if (vNode.props) {
      for (const key in vNode.props) {
        options.patchProps(el, key, null, vNode.props[key], shouldSetAsProps);
      }
    }
    options.insert(el, container);
  }
  // 更新
  function patchElement(n1, n2) {}

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
  // 属性配置
  patchProps(el, key, preValue, nextValue, shouldSetAsProps) {
    if (/^on/.test(key)) {
      // 定义 el._vei 为一个对象，存在事件名称到事件处理函数的映射
      const invokers = el._vei || (el._vei = {});
      let invoker = invokers[key];
      const name = key.slice(2).toLowerCase();
      // preValue && el.removeEventListener(name, preValue);
      // el.addEventListener(name, nextValue);
      if (nextValue) {
        if (!invoker) {
          invoker = el._vei[key] = e => {
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(func => func(e));
            } else {
              invoker.value(e);
            }
          };
          invoker.value = nextValue;
          el.addEventListener(name, invoker);
        } else {
          invoker.value = nextValue;
        }
      } else if (invoker) {
        el.removeEventListener(name, invoker);
      }
    } else if (key === "class") {
      el.className = nextValue || "";
    } else if (shouldSetAsProps(el, key, nextValue)) {
      const type = typeof el[key];
      if (type === "boolean" && nextValue === "") {
        el[key] = true;
      } else {
        el[key] = nextValue;
      }
    } else {
      el.setAttribute(key, nextValue);
    }
  },
  // 从父级卸载指定子集
  unmount(vNode) {
    const parent = vNode.el.parentNode;
    if (parent) parent.removeChild(vNode.el);
  },
});

const vNode = {
  type: "div",
  props: {
    id: "foo",
    // normalizeClass将数组、对象、字符串转换为单纯的字符串
    // class: normalizeClass(["foo bar", { baz: true }]),
    class: "foo bar",
    onClick: () => {
      console.log("666");
    },
  },
  children: [
    {
      type: "h1",
      children: "999",
    },
  ],
};
effect(() => {
  renderer.render(vNode, document.getElementById("app"));
});
