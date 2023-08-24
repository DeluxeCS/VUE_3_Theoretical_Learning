const { effect, ref } = VueReactivity;

function createRenderer(options) {
  const { createElement, setTextContent, insert, patchProps } = options;
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
   */
  function patch(n1, n2, container) {
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
        mountElement(n2, container);
      } else {
        patchElement(n1, n2);
      }
    } else if (typeof type === "object") {
      // 描述为组件类型
    } else {
      // 其他类型node
    }
  }

  /**
   * 打补丁
   * @param {*} n1
   * @param {*} n2
   */
  function patchElement(n1, n2) {
    // 旧元素节点获取
    const element = (n2.element = n1.element);
    const oldProps = n1.props;
    const newProps = n2.props;
    // 以新节点为基准 更新props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(element, key, oldProps[key], newProps[key]);
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(element, key, oldProps[key], null);
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
      if (Array.isArray(n1.children)) {
        // 代码运行到这里，则说明新旧子节点都是一组子节点，这里涉及核心的Diff 算法

        // ^傻瓜式
        // 将旧的一组子节点全部卸载
        n1.children.forEach(c => unmount(c));
        // 再将新的一组子节点全部挂载到容器中
        n2.children.forEach(c => patch(null, c, container));
      } else {
        setElementText(container, "");
        n2.children.forEach(c => patch(null, c, container));
      }
      n2.children.forEach(el => {});
    } else {
      // 代码运行到这里，说明新子节点不存在
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      } else if (typeof n1.children === "string") {
        setElementText(container, "");
      }
    }
  }
  // 卸载操作
  function unmount(vnode) {
    const parent = vnode.element.parentNode;
    if (parent) parent.removeChild(vnode.element);
  }

  /**
   * 挂载方法定义
   * @param {*} vnode
   * @param {*} container
   */
  function mountElement(vnode, container) {
    const element = (vnode.element = createElement(vnode.type));
    if (typeof vnode.children === "string") {
      setTextContent(element, vnode.children);
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach(child => {
        patch(null, child, element);
      });
    }
    if (vnode.props) {
      for (const key in vnode.props) {
        patchProps(element, key, null, vnode.props[key]);
      }
    }
    insert(element, container);
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
  setTextContent(el, text) {
    el.textContent = text; // 用于设置元素的文本节点
  },
  insert(element, parent, anchor = null) {
    parent.insertBefore(element, anchor); // 用于在给定的 parent 下添加指定元素
  },
  /**
   * 是否可变更标签属性,可作为DOMProperties被设置
   * @param {*} element
   * @param {*} key
   * @param {*} value
   */
  shouldSetAsProps(element, key, value) {
    if (key === "form" && element.targetName === "INPUT") return false;
    return key in element;
  },
  patchProps(element, key, prevValue, nextValue) {
    // 设置class为HTMLAttribute属性有三种方式1、className，2、setAttribute，3、classList
    if (/^on/.test(key)) {
      let invokers = element.vei || (element.vei = {});
      let invoker = invokers[key];
      const name = key.slice(2).toLowerCase();
      if (nextValue) {
        if (!invoker) {
          // invoker.value是否数组，遍历调用事件处理函数
          invoker = element.evi = e => {
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
          element.addEventListener(name, invoker);
        } else {
          invoker.value = nextValue;
        }
      } else if (invoker) {
        element.removeEventListener(name, invoker);
      }
    } else if (key === "class") {
      element.className = nextValue || "";
      // 此处先做DOM properties配置，后做HTML attribute属性配置
    } else if (options.shouldSetAsProps(element, key, nextValue)) {
      // <input disabled></input>
      if (typeof element[key] === "boolean" && nextValue === "") {
        element[key] = true;
      } else {
        element[key] = false;
      }
    } else {
      // 后做HTML attribute属性配置
      element.setAttribute(key, nextValue);
    }
  },
};
const renderer = createRenderer(options);
// 使用 normalizeClass 函数对值进行序列化
function normalizeClass() {
  return "foo bar baz";
}
// 定义虚拟节点vNode
const vnode = {
  type: "div",
  props: {
    disabled: "",
    class: normalizeClass(["foo bar", { baz: true }]),
    // props下的on为事件输出
    onClick: () => {
      console.log("onClick");
      console.log("onClick1");
    },
    onContextmenu: () => {
      console.log("onContextmenu");
    },
  },
  children: [
    {
      type: "h1",
      children: "I am child",
    },
  ],
};
// !HTML Attributes 的作用是设置与之对应的 DOM Properties 的初始值

// ^test用例
const bol = ref(false);
effect(() => {
  // 创建 vnode
  const vnode = {
    type: "div",
    props: bol.value
      ? {
          onClick: () => {
            alert("父元素 clicked");
          },
        }
      : {},
    children: [
      {
        type: "p",
        props: {
          onClick: () => {
            bol.value = true;
          },
        },
        children: "text",
      },
    ],
  };
  renderer.render(vnode, document.querySelector("#app"));
});
