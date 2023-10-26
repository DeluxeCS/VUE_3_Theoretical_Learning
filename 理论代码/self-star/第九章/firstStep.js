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
    } else if (typeof type === Text) {
      // 文本
      if (!n1) {
        const el = (n2.el = options.createText(n2.children));
        options.insert(el, container);
      } else {
        const el = (n2.el = n1.el);
        if (n2.children !== n1.children) {
          options.setText(el, n2.children);
        }
      }
    } else if (typeof type === Comment) {
      // 注释节点
      if (!n1) {
        const el = (n2.el = options.createComment(n2.children));
        options.insert(el, container);
      } else {
        const el = (n2.el = n1.el);
        if (n2.children !== n1.children) {
          options.setText(el, n2.children);
        }
      }
    } else if (typeof type === Fragment) {
      // 片段
      if (!n1) {
        n2.children.forEach(c => patch(null, c, container));
      } else {
        patchChildren(n1, n2, container);
      }
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
  // 更新节点
  function patchElement(n1, n2) {
    const el = (n2.el = n1.el);
    // 更新节点属性
    const oldProps = n1.props;
    const newProps = n2.props;
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        options.patchProps(el, key, oldProps[key], newProps[key], shouldSetAsProps);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        options.patchProps(el, key, oldProps[key], null, shouldSetAsProps);
      }
    }
    // 更新子节点
    patchChildren(n1, n2, el);
  }
  // 更新子节点
  function patchChildren(n1, n2, container) {
    if (typeof n2.children === "string") {
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => options.unmount(c));
      }
      options.setElementText(container, n2.children);
    } else if (Array.isArray(n2.children)) {
      if (Array.isArray(n1.children)) {
        const oldChildren = n1.children;
        const newChildren = n2.children;
        const oldLen = oldChildren.length;
        const newLen = newChildren.length;
        const commonLength = Math.min(oldLen, newLen);
        // 当心纠结点length不相等
        for (let i = 0; i < commonLength; i++) {
          patch(oldChildren[i], newChildren[i], container);
        }
        // 如果 newLen > oldLen，说明有新子节点需要挂载
        if (newLen > oldLen) {
          for (let i = commonLength; i < newLen; i++) {
            patch(null, newChildren[i], container);
          }
          // 如果 oldLen > newLen，说明有旧子节点需要卸载
        } else if (oldLen > newLen) {
          for (let i = commonLength; i < oldLen; i++) {
            options.unmount(oldChildren[i]);
          }
        }
      } else {
        options.setElementText(container, "");
        n2.children.forEach(c => patchElement(null, c, container));
      }
    } else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => options.unmount(c));
      } else if (typeof n1.children === "string") {
        options.setElementText(container, "");
      }
    }
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
            if (e.timeStamp < invoker.attached) return;
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(func => func(e));
            } else {
              invoker.value(e);
            }
          };
          invoker.value = nextValue;
          invoker.attached = performance.now();
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
    if (vNode.type === Fragment) {
      vNode.children.forEach(c => unmount(c));
      return;
    }
    const parent = vNode.el.parentNode;
    if (parent) parent.removeChild(vNode.el);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  createComment(text) {
    return document.createComment(text);
  },
  setText(el, text) {
    el.nodeValue = text;
  },
});

const oldVNode = {
  type: "div",
  children: [
    { type: "p", children: "1" },
    { type: "p", children: "2" },
    { type: "p", children: "3" },
  ],
};

renderer.render(oldVNode, document.querySelector("#app"));
const newVNode = {
  type: "div",
  children: [
    { type: "p", children: "4" },
    { type: "p", children: "5" },
    { type: "p", children: "6" },
  ],
};

renderer.render(newVNode, document.querySelector("#app"));
