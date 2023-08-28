const { effect, ref } = VueReactivity;

function createRenderer(options) {
  const { createElement, setElementText, insert, patchProps, setText, createText } = options;
  function render(vnode, container) {
    if (vnode) {
      // 新旧节点比较后，挂载或打补丁
      patch(container._vnode, vnode, container);
    } else {
      // 卸载操作
      if (container._vnode) {
        unmount(container._vnode);
      }
    }
    container._vnode = vnode;
  }
  /**
   * 挂载或打补丁执行流程方法定义
   * @param {*} n1
   * @param {*} n2
   * @param {*} container
   * @param {*} anchor
   */
  function patch(n1, n2, container, anchor) {
    // 当前后打补丁的type不一致
    if (n1 && n1.type !== n2.type) {
      // 卸载
      unmount(n1);
      n1 = null;
    }
    const { type } = n2;
    // 此处为普通标签元素
    if (typeof type === "string") {
      if (!n1) {
        // 执行挂载
        mountElement(n2, container, anchor);
      } else {
        patchElement(n1, n2);
      }
    } else if (type === Text) {
      if (!n1) {
        const el = (n2.el = document.createTextNode(n2.children));
        insert(el, container);
      } else {
        const el = (n2.el = n1.el);
        if (n2.children !== n1.children) {
          // 调用 setText 函数更新文本节点的内容
          setText(el, n2.children);
        }
      }
    } else if (typeof type === "object") {
      // 描述为组件类型
    } else {
      // 其他类型node
    }
  }

  /**
   * 打补丁（更新props再更新children）
   * @param {*} n1
   * @param {*} n2
   */
  function patchElement(n1, n2) {
    // 旧元素节点获取
    const el = (n2.el = n1.el);
    const oldProps = n1.props;
    const newProps = n2.props;
    // 以新节点为基准 更新props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key]);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null);
      }
    }
    // 第二步：更新 children
    patchChildren(n1, n2, el);
  }
  /**
   * 更新子节点内容
   * @param {*} n1 旧node
   * @param {*} n2 新node
   * @param {*} container
   */
  function patchChildren(n1, n2, container) {
    // 判断新子节点的类型是否是文本节点
    if (typeof n2.children === "string") {
      // 旧子节点的类型有三种可能：没有子节点、文本子节点以及一组子节点
      // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      }
      // 最后将新的文本节点内容设置给容器元素
      setElementText(container, n2.children);
    } else if (Array.isArray(n2.children)) {
      // 封装 patchKeyedChildren 函数处理两组子节点
      patchKeyedChildren(n1, n2, container);
    } else {
      // 代码运行到这里，说明新子节点不存在,清空新节点
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      } else if (typeof n1.children === "string") {
        setElementText(container, "");
      }
    }
  }
  // 双端算法
  function patchKeyedChildren(n1, n2, container) {
    const oldChildren = n1.children;
    const newChildren = n2.children;
    // 四个索引值
    let oldStartIdx = 0;
    let oldEndIdx = oldChildren.length - 1;
    let newStartIdx = 0;
    let newEndIdx = newChildren.length - 1;
    // 指定索引对应的node节点
    let oldStartVNode = oldChildren[oldStartIdx];
    let oldEndVNode = oldChildren[oldEndIdx];
    let newStartVNode = newChildren[newStartIdx];
    let newEndVNode = newChildren[newEndIdx];
  }
  // 卸载操作
  function unmount(vnode) {
    const parent = vnode.el.parentNode;
    if (parent) parent.removeChild(vnode.el);
  }

  /**
   * 挂载方法定义
   * @param {*} vnode
   * @param {*} container
   * @param {*} anchor
   */
  function mountElement(vnode, container, anchor) {
    const el = (vnode.el = createElement(vnode.type));
    if (typeof vnode.children === "string") {
      setElementText(el, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, el);
      });
    }
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(el, key, null, vnode.props[key]);
      }
    }
    insert(el, container, anchor);
  }

  return {
    render,
  };
}
// 创建渲染器
const options = {
  createElement(tag) {
    return document.createElement(tag); // 元素创建
  },
  // 用于设置元素的文本节点
  setElementText(el, text) {
    el.textContent = text;
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor); // 用于在给定的 parent 下添加指定元素
  },
  /**
   * 是否可变更标签属性,可作为DOMProperties被设置
   * @param {*} el
   * @param {*} key
   * @param {*} value
   */
  shouldSetAsProps(el, key, value) {
    if (key === "form" && el.targetName === "INPUT") return false;
    return key in el;
  },
  patchProps(el, key, prevValue, nextValue) {
    // 设置class为HTMLAttribute属性有三种方式1、className，2、setAttribute，3、classList
    if (/^on/.test(key)) {
      let invokers = el.vei || (el.vei = {});
      let invoker = invokers[key];
      const name = key.slice(2).toLowerCase();
      if (nextValue) {
        if (!invoker) {
          // invoker.value是否数组，遍历调用事件处理函数
          invoker = el.evi = e => {
            // e.timeStamp 是事件发生的时间
            // 如果事件发生的时间早于事件处理函数绑定的时间，则不执行事件处理函数
            if (e.timeStamp < invoker.attached) return;
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(fn => fn(e));
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
      // 此处先做DOM properties配置，后做HTML attribute属性配置
    } else if (options.shouldSetAsProps(el, key, nextValue)) {
      // <input disabled></input>
      if (typeof el[key] === "boolean" && nextValue === "") {
        el[key] = true;
      } else {
        el[key] = false;
      }
    } else {
      // 后做HTML attribute属性配置
      el.setAttribute(key, nextValue);
    }
  },
  createText(text) {
    return document.createTextNode(text);
  },
  setText(el, text) {
    el.nodeValue = text;
  },
};
const renderer = createRenderer(options);
// 使用 normalizeClass 函数对值进行序列化
function normalizeClass() {
  return "foo bar baz";
}

// !HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值

// 创建 vnode
const oldVNode = {
  type: "div",
  children: [
    { type: "h1", children: "OLD1", key: 1 },
    { type: "h2", children: "OLD2", key: 2 },
    { type: "h3", children: "OLD3", key: 3 },
    { type: "h4", children: "NEW4", key: 4 },
  ],
};
const newVNode = {
  type: "div",
  children: [
    { type: "h3", children: "NEW3", key: 3 },
    { type: "h1", children: "NEW1", key: 1 },
    { type: "h2", children: "NEW2", key: 2 },
  ],
};
renderer.render(oldVNode, document.querySelector("#app"));
setTimeout(() => {
  renderer.render(newVNode, document.querySelector("#app"));
}, 2000);
