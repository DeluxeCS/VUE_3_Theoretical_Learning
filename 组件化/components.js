const { effect, ref } = VueReactivity;
// 递增子序列
function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = ((u + v) / 2) | 0;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}

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
    debugger;
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
      if (!n1) {
        mountComponent(n2, container, anchor);
      } else {
        patchComponent(n1, n2, anchor);
      }
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
  // 快速算法预处理-两头重复数据
  function patchKeyedChildren(n1, n2, container) {
    const oldChildren = n1.children;
    const newChildren = n2.children;
    // 头部开始处理数据
    let j = 0;
    let oldVNode = oldChildren[j];
    let newVNode = newChildren[j];
    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container);
      j++;
      oldVNode = oldChildren[j];
      newVNode = newChildren[j];
    }
    // 尾端处理数据
    let oldEnd = oldChildren.length - 1;
    let newEnd = newChildren.length - 1;
    oldVNode = oldChildren[oldEnd];
    newVNode = newChildren[newEnd];
    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container);
      oldEnd--;
      newEnd--;
      oldVNode = oldChildren[oldEnd];
      newVNode = newChildren[newEnd];
    }
    // 未匹配数据处理（新节点）
    if (j <= newEnd && j > oldEnd) {
      // 获取dom迁移的锚点位置
      const anchorIndex = newEnd + 1;
      const anchor = anchorIndex > newChildren.length ? null : newChildren[anchorIndex];
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor);
      }
    } else if (j <= oldEnd && j > newEnd) {
      // 未匹配数据处理（旧节点）
      while (j <= oldEnd) {
        unmount(oldChildren(j++));
      }
    } else {
      // 判断是否有节点需要移动，以及应该如何移动；
      const count = newEnd - j + 1;
      const source = new Array(count);
      source.fill(-1);
      // 找出那些需要被添加或移除的节点
      // 存储新的一组节点的对应旧组节点的DOM真是索引
      const oldStart = j;
      const newStart = j;
      let moved = false;
      let pos = 0;
      const keyIndex = {}; // 构建索引表
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i;
      }
      // 新增 patched 变量，代表更新过的节点数量
      let patched = 0;
      for (let i = oldStart; i <= oldEnd; i++) {
        oldVNode = oldChildren[i];
        if (patched < count) {
          // ^以keyIndex为介质，新旧节点一定存在相同的KEY
          const k = keyIndex[oldVNode.key];
          if (typeof k !== "undefined") {
            newVNode = newChildren[k];
            patch(oldVNode, newVNode, container);
            source[k - newStart] = i;
            patched++;
            if (k < pos) {
              moved = true;
            } else {
              pos = k;
            }
          } else {
            unmount(oldVNode);
          }
        } else {
          unmount(oldVNode);
        }
      }
      if (moved) {
        const seq = getSequence(source);
        let s = seq.length - 1;
        let i = count - 1;
        for (i; i >= 0; i--) {
          if (source[i] === -1) {
            const pos = i + newStart;
            const newVNode = newChildren[pos];
            const nextPos = pos + 1;
            const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
            patch(null, newVNode, container, anchor);
          } else if (i !== seq[s]) {
            // 该节点在新的一组子节点中的真实位置索引
            const pos = i + newStart;
            const newVNode = newChildren[pos];
            // 该节点的下一个节点的位置索引
            const nextPos = pos + 1;
            // 锚点
            const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null;
            // 移动
            insert(newVNode.el, container, anchor);
          } else {
            s--;
          }
        }
      }
    }
  }
  // 组件挂载
  function mountComponent(vnode, container, anchor) {
    const componentOptions = vnode.type;
    const { render, data } = componentOptions;
    const state = reactive(data());
    effect(() => {
      const subTree = render.call(state, state);
      patch(null, subTree, container, anchor);
    });
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

const MyComponent = {
  // 组件名称，可选
  name: "MyComponent",
  data() {
    return {
      foo: "hello yel",
    };
  },
  // 组件的渲染函数，其返回值必须为虚拟 DOM
  render() {
    return {
      type: "div",
      children: `我是文本${this.foo}`,
    };
  },
};
const CompVNode = {
  // 组件名称，可选
  type: MyComponent,
};
renderer.render(CompVNode, document.querySelector("#app"));
