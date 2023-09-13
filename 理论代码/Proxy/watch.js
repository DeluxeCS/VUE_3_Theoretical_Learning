/**
 * 进步原因
 * ^watch数据变更实时监听
 * ^立即执行 immediate
 * ^延后执行 flush
 */

// 副作用函数的存储与读取
const bucket = new WeakMap();

// 声明原始值
const data = {
  foo: 1,
  bar: 9,
};

var activeEffect = null;
// 副作用函数堆栈
var effectStack = [];
/**
 * 注册副作用函数
 * @param {*} func 副作用函数
 * @param {*} options 调度器
 * @returns
 */
function effect(func, options = {}) {
  const effectFn = () => {
    cleanup(effectFn); // 清空一次
    activeEffect = effectFn; // 在副作用函数执行前
    effectStack.push(effectFn);
    const result = func();
    effectStack.pop(); // 先执行，再抛出顶层副函数
    activeEffect = effectStack[effectStack.length - 1]; // 恢复次级副函数=>为全局副作用函数
    return result;
  };
  effectFn.deps = []; // 副作用函数及关联的副作用对象关系链
  // ^挂在options到effectFn上
  effectFn.options = options;
  if (!options.lazy) effectFn();
  return effectFn; // 副作用函数作为参数return
}

// 清空关联的副作用方法链
function cleanup(effectFn) {
  for (let index = 0; index < effectFn.deps.length; index++) {
    const element = effectFn.deps[index];
    element.delete(effectFn);
  }
  effectFn.length = 0;
}

// 代理对象
const obj = new Proxy(data, {
  get(target, key) {
    track(target, key);
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    trigger(target, key);
  },
});
// 函数封装
function track(target, key) {
  console.log("get", target, key);
  if (!activeEffect) return target[key]; // 无方法时，直接返回结果.
  let depsMap = bucket.get(target); // 获取目标对象
  if (!depsMap) bucket.set(target, (depsMap = new Map())); // 如果不存在，则创建目标对象
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set())); // 如果不存在，则创建目标key
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  console.log("set", target, key);
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  const effectsRun = new Set();
  // 此处做了守卫，判断副作用函数与正在执行副作用函数是否相同
  // 相同-不做处理。
  effects &&
    effects.forEach(func => {
      if (activeEffect !== func) {
        effectsRun.add(func);
      }
    });
  effectsRun &&
    effectsRun.forEach(effectFn => {
      if (effectFn.options.scheduler) {
        effectFn.options.scheduler();
      } else {
        effectFn();
      }
    });
}

/**
 * 监听属性
 * @param {*} source
 * @param {*} cb
 */
function watch(source, callback, options = {}) {
  // 此处的【source.foo】为硬编码，不具备通用性
  // effect(() => source.foo, {
  let getter;
  // 如果source为函数，返回getter，否则调用traverse()方法
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let newValue, oldValue;
  // cleanup 存储运行过的过期回调函数
  let cleanup;
  function onInvalidate(func) {
    cleanup = func;
  }
  // 封提取scheduler调度函数为独立的job
  const job = () => {
    newValue = effectFn();
    if (cleanup) {
      cleanup();
    }
    oldValue = newValue;
  };
  const effectFn = effect(getter, {
    lazy: true, // 开启lazy，将数据保存在effectFn中，但方法未执行
    scheduler: () => {
      if (options.flush === "post") {
        const p = Promise.resolve();
        p.then(job);
      } else {
        job();
      }
    },
  });
  if (options.immediate) {
    // 当immediate为true立即执行job，触发回调执行
    job();
  } else {
    oldValue = effectFn();
  }
}

/**
 * ^定制一个通用的数据读取操作
 * @param {*} value
 * @param {*} seen
 * @returns
 */
function traverse(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  // 此处不考虑数组等其他情况
  for (const key in value) {
    traverse(value[key], seen);
  }
  return value;
}

// 执行副作用函数注册方法
watch(
  obj,
  async (newValue, oldValue, onInvalidate) => {
    //* 定义数据过期标识
    let expired = false;
    onInvalidate(() => {
      expired = true;
    });
    const res = await fetch("/path/to/request");
    if (expired) {
      finalData = res;
    }
  },
  {
    immediate: false,
    //post调度函数将副作用函数置入为任务队列，待DOM更新结束执行。
    flush: "post", //& post、sync、pre
  }
);
obj.foo += 1;

setTimeout(() => {
  obj.foo += 1;
}, 1000);
